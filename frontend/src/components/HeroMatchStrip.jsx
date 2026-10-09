import anika from "../assets/avatars/anika.svg"
import arjun from "../assets/avatars/arjun.svg"
import aisha from "../assets/avatars/aisha.svg"
import meera from "../assets/avatars/meera.svg"
import kabir from "../assets/avatars/kabir.svg"
import rohan from "../assets/avatars/rohan.svg"
import zara from "../assets/avatars/zara.svg"
import tara from "../assets/avatars/tara.svg"

const AVATARS = [anika, arjun, meera, zara, kabir, rohan, tara, aisha];

function HeroMatchStrip() {
  return (
    <div className="flex items-end justify-center gap-3">
      {AVATARS.map((avatar, index) => (
        <div key={index} className="relative w-20">
          <img src={avatar} alt="" className="w-full" />
        </div>
      ))}
    </div>
  );
}

export default HeroMatchStrip;
