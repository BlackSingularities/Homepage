export default function TextBreak({ text, before }) {
  if (!before) return text

  const breakAt = text.lastIndexOf(before)
  if (breakAt <= 0) return text

  return (
    <>
      {text.slice(0, breakAt).trimEnd()}
      <span className="text-new-line">{text.slice(breakAt)}</span>
    </>
  )
}
