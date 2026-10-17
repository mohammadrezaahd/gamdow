"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AutoAwesomeRounded,
  CollectionsBookmarkRounded,
  MenuBookRounded,
  SportsEsportsRounded,
  TrendingUpRounded,
} from "@mui/icons-material";
import styles from "./landing-page.module.css";

const capabilities = [
  {
    number: "01",
    icon: <SportsEsportsRounded />,
    title: "A library that feels like yours.",
    text: "Add games yourself or bring in selected Steam titles. Organize your collection with shelves, genres, series, and tags.",
    label: "COLLECT",
  },
  {
    number: "02",
    icon: <TrendingUpRounded />,
    title: "Pick up where you left off.",
    text: "Keep status, playtime, and story progress together. Your journal turns the little updates into a clear day-by-day track.",
    label: "KEEP YOUR PLACE",
  },
  {
    number: "03",
    icon: <MenuBookRounded />,
    title: "Remember what it meant.",
    text: "Write reviews, leave session notes, and save gallery moments. Mark spoilers so the best surprises stay yours to reveal.",
    label: "REMEMBER",
  },
  {
    number: "04",
    icon: <CollectionsBookmarkRounded />,
    title: "Make a shelf for next time.",
    text: "Curate collections, shape your backlog, and keep the next adventure close without losing sight of the one you’re in.",
    label: "LOOK AHEAD",
  },
];

export function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.setAttribute("data-revealed", "true"));
      return;
    }

    root.classList.add(styles.motionReady);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-revealed", "true");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -36px 0px" },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.landingPage} id="top" ref={pageRef}>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <Link className={styles.brand} href="/" aria-label="Gamdow home">
            <span className={styles.brandMark} aria-hidden="true">g<span /></span>
            <span className={styles.brandWord}>gamdow</span>
          </Link>
          <nav className={styles.navigation} aria-label="Landing page">
            <a href="#what-it-keeps">The archive</a>
            <a href="#platforms">Connected worlds</a>
          </nav>
          <div className={styles.headerActions}>
            <Link className={styles.loginLink} href="/login">Log in</Link>
            <Link className={styles.headerCta} href="/register">
              Start your archive <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroArt} aria-hidden="true">
            <Image
              src="/images/gamdow-landing-hero.webp"
              alt=""
              fill
              priority
              sizes="100vw"
              className={styles.heroImage}
            />
            <div className={styles.heroFade} />
            <div className={styles.orbit} />
            <div className={`${styles.floatingTag} ${styles.floatingTagTop}`}>
              <span className={styles.statusDot} /> PERSONAL PLAY ARCHIVE
            </div>
            <div className={`${styles.floatingTag} ${styles.floatingTagBottom}`}>
              <span>COLLECT</span><i /><span>PLAY</span><i /><span>REMEMBER</span>
            </div>
            <div className={styles.heroIndex}>OBJECT 001 <span>·</span> A LIFE IN GAMES</div>
          </div>

          <div className={`${styles.container} ${styles.heroContent}`}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}><span /> AN INDEPENDENT GAME ARCHIVE</p>
              <h1 id="landing-title">Every game<br />leaves a <em>trace.</em></h1>
              <p className={styles.heroDescription}>
                The worlds you played, the stories you finished, the ones still waiting. Give every part of your game life a place to live.
              </p>
              <div className={styles.heroActions}>
                <Link className={styles.primaryButton} href="/register">
                  Make your archive <span aria-hidden="true">↗</span>
                </Link>
                <a className={styles.scrollLink} href="#what-it-keeps">
                  Take a look <span aria-hidden="true">↓</span>
                </a>
              </div>
              <div className={styles.heroFootnote}>
                <span className={styles.indexRule} />
                A home for every playthrough worth remembering.
              </div>
            </div>

            <div className={styles.heroArtifact} aria-hidden="true">
              <div className={styles.artifactHalo} />
              <div className={styles.memoryCard}>
                <span className={styles.memoryCardIndex}>YOUR ARCHIVE <b>01</b></span>
                <div className={styles.memoryCardMark}><AutoAwesomeRounded /></div>
                <span className={styles.memoryCardCaption}>A little more<br />than a library.</span>
                <span className={styles.memoryCardLine} />
              </div>
            </div>
          </div>
          <div className={styles.heroBottomLine} aria-hidden="true">
            <span>VOL. 01 / YOUR PLAY LIFE</span><span>SCROLL TO EXPLORE <b>↓</b></span>
          </div>
        </section>

        <div className={styles.marquee} aria-hidden="true">
          <div className={styles.marqueeTrack}>
            {Array.from({ length: 4 }, (_, index) => (
              <span key={index}>COLLECT <i>✳</i> PLAY <i>✳</i> REMEMBER <i>✳</i> KEEP GOING <i>✳</i></span>
            ))}
          </div>
        </div>

        <section className={`${styles.section} ${styles.capabilities}`} id="what-it-keeps" aria-labelledby="capabilities-title">
          <div className={styles.container}>
            <div className={styles.sectionHeading} data-reveal>
              <div>
                <p className={styles.sectionIndex}>01 / WHAT IT KEEPS</p>
                <h2 id="capabilities-title">More than a list<br />of <em>titles.</em></h2>
              </div>
              <p className={styles.sectionLead}>
                Your collection, your progress, your own words. One thoughtful place for the whole journey—not just the finish screen.
              </p>
            </div>

            <div className={styles.featureGrid}>
              {capabilities.map((item) => (
                <article className={styles.featureCard} key={item.number} data-reveal>
                  <div className={styles.featureTop}>
                    <span className={styles.featureNumber}>{item.number}</span>
                    <span className={styles.featureIcon} aria-hidden="true">{item.icon}</span>
                  </div>
                  <p className={styles.featureLabel}>{item.label}</p>
                  <h3>{item.title}</h3>
                  <p className={styles.featureText}>{item.text}</p>
                  <span className={styles.featureCorner} aria-hidden="true">↗</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.platformSection} id="platforms" aria-labelledby="platform-title">
          <div className={`${styles.container} ${styles.platformLayout}`}>
            <div className={styles.platformCopy} data-reveal>
              <p className={styles.sectionIndex}>02 / YOUR PLATFORMS</p>
              <h2 id="platform-title">Different worlds.<br /><em>One archive.</em></h2>
              <p className={styles.sectionLead}>
                Bring your connected library into the picture, then make the record your own. Gamdow keeps your memories in one place while you choose how each game gets there.
              </p>
              <Link className={styles.textLink} href="/register">Build your archive <span aria-hidden="true">↗</span></Link>
            </div>

            <div className={styles.platformVisual} data-reveal>
              <Image
                src="/images/gamdow-memory-object.webp"
                alt="A glass game case, archive marker, and trophy-like memory artifact suspended in a dark scene"
                fill
                sizes="(max-width: 900px) 100vw, 48vw"
                className={styles.platformImage}
              />
              <div className={styles.platformShade} />
              <div className={`${styles.platformCard} ${styles.steamCard}`}>
                <span className={styles.platformCardIndex}>CONNECTED LIBRARY / 01</span>
                <strong>Steam</strong>
                <span>Import selected games, playtime &amp; achievements.</span>
              </div>
              <div className={`${styles.platformCard} ${styles.epicCard}`}>
                <span className={styles.platformCardIndex}>ACCOUNT LINK / 02</span>
                <strong>Epic Games</strong>
                <span>Link your account; add games manually and track your story.</span>
              </div>
              <span className={styles.visualCaption}>ONE COLLECTION, MANY CHAPTERS</span>
            </div>
          </div>
          <div className={`${styles.container} ${styles.platformNote}`} data-reveal>
            <span className={styles.noteMark}>i</span>
            <p>Steam supports library import and supported playtime/achievement sync. Epic account linking is available; automatic Epic library import and playtime or achievement sync aren’t currently available.</p>
          </div>
        </section>

        <section className={styles.storySection} aria-labelledby="story-title">
          <div className={`${styles.container} ${styles.storyLayout}`}>
            <div className={styles.storyVisual} data-reveal>
              <div className={styles.storyImage}>
                <Image
                  src="/images/gamdow-memory-object.webp"
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 42vw"
                  className={styles.storyImageAsset}
                />
              </div>
              <div className={styles.storyStamp}><span>G</span><small>KEEP<br />THE<br />GOOD<br />BITS</small></div>
              <div className={styles.storyCaption}>A PERSONAL HISTORY<br />IN PLAY</div>
            </div>
            <div className={styles.storyCopy} data-reveal>
              <p className={styles.sectionIndex}>03 / THE GOOD BITS</p>
              <h2 id="story-title">The little details<br />make it <em>yours.</em></h2>
              <p className={styles.sectionLead}>
                A run you nearly gave up on. The ending you still think about. A screenshot you had to keep. Gamdow makes room for the parts that don’t fit in a completion badge.
              </p>
              <div className={styles.storyList}>
                <div><span>01</span><p>Daily play and progress, easy to follow.</p><b>↗</b></div>
                <div><span>02</span><p>Reviews and notes, in your own words.</p><b>↗</b></div>
                <div><span>03</span><p>Gallery memories with spoiler-aware controls.</p><b>↗</b></div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.finalSection} aria-labelledby="final-title">
          <div className={`${styles.container} ${styles.finalCard}`} data-reveal>
            <div className={styles.finalOrb} aria-hidden="true" />
            <p className={styles.sectionIndex}>YOUR NEXT CHAPTER STARTS HERE</p>
            <h2 id="final-title">Keep the worlds<br />that <em>stayed.</em></h2>
            <p>Start with one game. Build an archive that grows with you.</p>
            <Link className={styles.primaryButton} href="/register">Start your archive <span aria-hidden="true">↗</span></Link>
            <span className={styles.finalAside}>NO PERFECT RUN REQUIRED.</span>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <Link className={styles.brand} href="/" aria-label="Gamdow home">
            <span className={styles.brandMark} aria-hidden="true">g<span /></span>
            <span className={styles.brandWord}>gamdow</span>
          </Link>
          <span className={styles.footerLine}>COLLECT / PLAY / REMEMBER</span>
          <div className={styles.footerLinks}>
            <Link href="/login">Log in</Link>
            <Link href="/register">Create account</Link>
            <a href="#top">Back to top ↑</a>
          </div>
          <span className={styles.copyright}>AN INDEPENDENT PLAY ARCHIVE</span>
        </div>
      </footer>
    </div>
  );
}
