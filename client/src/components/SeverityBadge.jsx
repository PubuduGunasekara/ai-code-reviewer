// Maps severity level to colours
// Used on every issue card in the review detail page
const COLOURS = {
  critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  medium:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  low:      'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  info:     'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

export default function SeverityBadge({ severity }) {
  const classes = COLOURS[severity] || COLOURS.info;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${classes}`}>
      {severity}
    </span>
  );
}