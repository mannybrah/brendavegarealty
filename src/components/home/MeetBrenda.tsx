import Image from "next/image";
import Link from "next/link";

// Sits directly under the hero. The longer biography lives on /about, so the
// introduction is not repeated further down the page.
export function MeetBrenda() {
  return (
    <section className="ed ed-meet" id="brenda">
      <div className="ed-portrait">
        <Image
          src="/images/home/brenda-portrait.jpg"
          alt="Brenda Vega"
          width={1400}
          height={933}
          loading="lazy"
          sizes="(max-width: 750px) 84vw, 36vw"
        />
      </div>
      <div>
        <p className="ed-kicker">Meet Brenda Vega</p>
        <h2>
          Local perspective.
          <br />
          <em>Human connection.</em>
        </h2>
        <p className="ed-meet-copy">
          Your next move is personal. Brenda takes the time to understand what matters to you, bringing local
          perspective and thoughtful guidance to your next chapter.
        </p>
        <p className="ed-signature">Brenda Vega</p>
        <Link className="ed-textlink" href="/about">
          Meet Brenda <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
