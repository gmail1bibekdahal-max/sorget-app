"use client";

import { useState } from "react";

export default function PaddlePlaceholderButton({
  id,
  className,
  style,
  title,
}: {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const [clicked, setClicked] = useState(false);

  return (
    <button
      id={id}
      type="button"
      className={className}
      style={style}
      title={title}
      onClick={() => setClicked(true)}
      disabled={clicked}
    >
      {clicked ? "Paddle integration coming soon!" : "Continue to Payment (Paddle)"}
    </button>
  );
}
