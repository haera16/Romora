import { useEffect, useState } from "react";
import anika from "../assets/avatars/anika.svg";
import meera from "../assets/avatars/meera.svg";
import zara from "../assets/avatars/zara.svg";
import arjun from "../assets/avatars/arjun.svg";
import kabir from "../assets/avatars/kabir.svg";
import aisha from "../assets/avatars/aisha.svg";
import tara from "../assets/avatars/tara.svg";
import rohan from "../assets/avatars/rohan.svg";
import diamond from "../assets/romora_diamond.svg";

const AVATARS = [anika, meera, zara, arjun, kabir, aisha, tara, rohan];

const SLOT = 120; // distance between avatar centers (px)
const SIZE = 90; // base avatar width (px)
const VISIBLE = 5; // avatars drawn on each side of the middle one
const INTERVAL = 1800; // time between slides (ms)

function scaleFor(distance) {
  if (distance === 0) return 1.5;
  if (distance === 1) return 0.8;
  return 0.65;
}

function opacityFor(distance) {
  if (distance === 0) return 1;
  if (distance === 1) return 0.9;
  if (distance === 2) return 0.6;
  return 0.35;
}

function HeroMatchStrip() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => s + 1), INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const offsets = Array.from({ length: VISIBLE * 2 + 1 }, (_, k) => k - VISIBLE);

  return (
    <div className="relative h-72 w-full overflow-hidden rounded-3xl bg-sky-100 shadow-xl">
      {/* the fixed square frame in the middle */}
      <div className="absolute left-1/2 top-1/2 h-56 w-38 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-green-500 bg-white/50 shadow-[0_0_24px_rgba(34,197,94,0.45)]" />

      {/* the sliding avatars */}
      {offsets.map((offset) => {
        const position = step + offset;
        const avatar =
          AVATARS[((position % AVATARS.length) + AVATARS.length) % AVATARS.length];
        const distance = Math.abs(offset);

        return (
          <img
            key={position}
            src={avatar}
            alt=""
            className="absolute transition-[transform,opacity] duration-700 ease-in-out"
            style={{
              width: SIZE,
              left: "50%",
              top: "50%",
              marginLeft: -SIZE / 2,
              transform: `translate(${offset * SLOT}px, -50%) scale(${scaleFor(distance)})`,
              opacity: opacityFor(distance),
              zIndex: distance === 0 ? 10 : 1,
            }}
          />
        );
      })}

      {/* the diamond over the middle avatar */}
      <div className="pointer-events-none absolute left-1/2 top-[44px] z-20 -translate-x-1/2">
        <img src={diamond} alt="" className="diamond-bob w-6" />
      </div>
    </div>
  );
}

export default HeroMatchStrip;