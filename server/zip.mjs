/**
 * Strumieniowy ZIP bez kompresji (metoda „store”) – APK, EXE i IPA są już
 * skompresowane, więc deflate tylko by spowalniał. Pliki idą jeden po drugim
 * prosto z GitHuba do przeglądarki, bez trzymania ich w pamięci ani na dysku.
 * Rozmiar i CRC każdego pliku znamy dopiero po przesłaniu, dlatego lądują
 * w deskryptorze danych za plikiem (bit 3 flag). Formatu ZIP64 nie ma: jeden
 * plik i całe archiwum muszą zmieścić się w 4 GB, co przy aplikacjach starcza.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(crc, chunk) {
  let c = crc ^ 0xffffffff
  for (let i = 0; i < chunk.length; i++) c = CRC_TABLE[(c ^ chunk[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Data i godzina w formacie DOS, którego wymaga nagłówek ZIP. */
function dosTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

/**
 * Pisze archiwum do `out` (np. odpowiedzi Express). `entries` to lista
 * `{ name, open }`, gdzie `open()` zwraca asynchronicznie iterowalny strumień
 * bajtów. Plik, którego nie da się otworzyć, jest pomijany, a jego nazwa
 * trafia do zwróconej listy błędów.
 */
export async function writeZip(out, entries) {
  const write = chunk => new Promise((resolve, reject) => {
    if (out.destroyed) return reject(new Error('Połączenie przerwane.'))
    out.write(chunk) ? resolve() : out.once('drain', resolve)
  })
  const central = []
  const failed = []
  let offset = 0
  const { time, day } = dosTime(new Date())

  for (const entry of entries) {
    let body
    try {
      body = await entry.open()
    } catch {
      failed.push(entry.name)
      continue
    }
    const name = Buffer.from(entry.name, 'utf8')
    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(0x0808, 6) // deskryptor danych + nazwy w UTF-8
    header.writeUInt16LE(0, 8)
    header.writeUInt16LE(time, 10)
    header.writeUInt16LE(day, 12)
    header.writeUInt16LE(name.length, 26)
    await write(header)
    await write(name)

    let crc = 0
    let size = 0
    for await (const piece of body) {
      const chunk = Buffer.isBuffer(piece) ? piece : Buffer.from(piece)
      crc = crc32(crc, chunk)
      size += chunk.length
      await write(chunk)
    }

    const descriptor = Buffer.alloc(16)
    descriptor.writeUInt32LE(0x08074b50, 0)
    descriptor.writeUInt32LE(crc, 4)
    descriptor.writeUInt32LE(size, 8)
    descriptor.writeUInt32LE(size, 12)
    await write(descriptor)

    central.push({ name, crc, size, offset })
    offset += header.length + name.length + size + descriptor.length
  }

  const start = offset
  for (const item of central) {
    const record = Buffer.alloc(46)
    record.writeUInt32LE(0x02014b50, 0)
    record.writeUInt16LE(20, 4)
    record.writeUInt16LE(20, 6)
    record.writeUInt16LE(0x0808, 8)
    record.writeUInt16LE(0, 10)
    record.writeUInt16LE(time, 12)
    record.writeUInt16LE(day, 14)
    record.writeUInt32LE(item.crc, 16)
    record.writeUInt32LE(item.size, 20)
    record.writeUInt32LE(item.size, 24)
    record.writeUInt16LE(item.name.length, 28)
    record.writeUInt32LE(item.offset, 42)
    await write(record)
    await write(item.name)
    offset += record.length + item.name.length
  }

  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(central.length, 8)
  end.writeUInt16LE(central.length, 10)
  end.writeUInt32LE(offset - start, 12)
  end.writeUInt32LE(start, 16)
  await write(end)
  return failed
}
