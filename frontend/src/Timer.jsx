import { useEffect, useState } from "react";
import { Clock1 } from "lucide-react";

function Timer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval); // cleanup
  }, [startTime]);

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return [
      h > 0 ? `${h}h` : null,
      m > 0 ? `${m}m` : null,
      `${s}s`
    ]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <span className="
  absolute right-3 top-3 
  flex items-center justify-center gap-1
  rounded-lg bg-gray-800/70 backdrop-blur-sm px-3 py-1
  font-mono text-xs sm:text-sm md:text-base
  w-auto min-w-[80px] max-w-[140px]
  shadow-md z-50
">
  <Clock1 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
  <span className="truncate">{formatDuration(elapsed)}</span>
</span>

  );
}

export default Timer;
