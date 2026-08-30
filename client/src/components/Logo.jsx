export default function Logo({ size = 44, showText = true }) {
  return (
    <div className="logo">
      <img
        src="/logo.png"
        alt="NexGen University logo"
        className="logo-image"
        width={size}
        height={size}
      />
      {showText && (
        <div className="logo-text">
          <strong>NexGen University</strong>
          <span>Excellence in education</span>
        </div>
      )}
    </div>
  );
}
