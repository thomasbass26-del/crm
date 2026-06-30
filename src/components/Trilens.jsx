// The Triskope mark: three overlapping lenses
export default function Trilens({ size = 30, light = false }) {
  const stroke = light ? '#f6f3ec' : '#161412'
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 50 36" fill="none" aria-hidden="true">
      <circle cx="16" cy="18" r="13" stroke={stroke} strokeWidth="1.6" opacity="0.9" />
      <circle cx="25" cy="18" r="13" stroke="#0e6e6d" strokeWidth="1.6" opacity="0.9" />
      <circle cx="34" cy="18" r="13" stroke={stroke} strokeWidth="1.6" opacity="0.55" />
    </svg>
  )
}
