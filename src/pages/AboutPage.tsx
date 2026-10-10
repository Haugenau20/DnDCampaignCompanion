// src/pages/AboutPage.tsx
import React from "react";
import { Link } from "react-router-dom";
import Typography from "core/components/Typography";
import { buttonClasses } from "core/components/Button";
import { RuneMark } from "core/components/RuneMark";

/** Where the code lives. */
export const SOURCE_URL = "https://github.com/Haugenau20/Muninn";

/**
 * Two parts of the page that wait on the maintainer: a "Buy me a coffee"
 * link and a photo beside "Who made it". Each is drawn once it has somewhere
 * to point, and not before -- `null` is the switch.
 */
export const ABOUT_EXTRAS: { coffeeUrl: string | null; photoSrc: string | null } = {
  coffeeUrl: null,
  photoSrc: null,
};

/** Body copy on this page: larger and looser than the app's, as befits reading. */
const PROSE = "text-[17px] leading-[1.7]";

/** A section heading on this page. */
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="h2" className="text-[30px] font-bold leading-[1.15]">
    {children}
  </Typography>
);

/**
 * `/about` -- why the site exists, where its name comes from, and who made
 * it. Public: the same page signed in or out.
 *
 * The one page where the name is explained at length. Everywhere else it
 * gets a line at most (design-language.md §11).
 */
const AboutPage: React.FC = () => (
  // Cancels `main`'s padding so the band meets the chrome, as on /signin.
  <div className="-mx-4 -mt-4 -mb-4">
    <section className="hero-band relative overflow-hidden px-6 pt-[72px] pb-16">
      {/* The rune as a watermark, in the band's own border tone. Only where
          it clears the 720px text column: narrower, it sat under the lead. */}
      <span className="hidden min-[1200px]:block absolute top-1/2 -translate-y-1/2 right-[max(24px,calc(50%_-_600px))] pointer-events-none about-watermark">
        <RuneMark size={280} />
      </span>

      <div className="relative max-w-[720px] mx-auto flex flex-col gap-4">
        <Typography
          variant="body-sm"
          className="hero-eyebrow text-[11px] font-semibold uppercase tracking-[0.12em]"
        >
          About
        </Typography>
        <Typography variant="h1" className="text-[clamp(34px,5vw,52px)] leading-[1.08]">
          A memory for the table
        </Typography>
        <Typography className="hero-muted text-lg leading-[1.55] max-w-[560px]">
          I built Muninn for my own table, so we&apos;d stop forgetting what happened
          between sessions. Your table is welcome to use it too.
        </Typography>
      </div>
    </section>

    <div className="px-6 pt-16 pb-[88px]">
      <div className="max-w-[720px] mx-auto flex flex-col gap-14">
        <section className="flex flex-col gap-4">
          <SectionTitle>Why it exists</SectionTitle>
          <Typography className={PROSE}>
            I play in a regular tabletop campaign, and between sessions we kept
            losing things: who that innkeeper was, which rumor we&apos;d already ruled
            out, what we promised the duke. Each of us remembered a different piece
            of it.
          </Typography>
          <Typography className={PROSE}>
            Muninn started as a place to keep our session recaps. Then it grew, one
            need at a time, to hold everything a party runs into: people, places,
            quests, rumors, and each player&apos;s own notes. All of it is written by
            whoever is at the table and credited to the character they play.
          </Typography>
        </section>

        <section className="card rounded-[10px] p-6 sm:p-8 grid grid-cols-[minmax(0,1fr)_auto] gap-7 items-start">
          <div className="flex flex-col gap-3.5">
            <SectionTitle>The name</SectionTitle>
            <Typography className="font-heading italic text-xl leading-normal">
              In Norse myth, Odin keeps two ravens. Every morning they fly out over
              the world, and every evening they come back and tell him what they
              saw. One is Huginn, thought. The other is Muninn, memory.
            </Typography>
            <Typography className={PROSE}>
              That&apos;s what this is for: a party goes out, comes back, and keeps
              what it saw. The mark is <RuneMark size={17} />, the M of the runic
              alphabet.
            </Typography>
            <Typography variant="body-sm" color="secondary">
              Pronounced roughly <span className="font-semibold typography">MOO-nin</span>.
            </Typography>
          </div>
          {/* Beside the text from `sm` up; on a phone the column is too narrow
              to give it room. */}
          <RuneMark size={96} className="hidden sm:block primary leading-[0.9]" />
        </section>

        <section className="flex flex-col gap-5">
          <SectionTitle>Who made it</SectionTitle>
          <div className="flex flex-wrap gap-6 items-start">
            {ABOUT_EXTRAS.photoSrc && (
              <img
                src={ABOUT_EXTRAS.photoSrc}
                alt="Søren"
                width={140}
                height={168}
                className="w-[140px] h-[168px] rounded-lg object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-[min(260px,100%)] flex flex-col gap-4">
              <Typography className={PROSE}>
                I&apos;m Søren, a software engineer and an active TTRPG player. Muninn
                was also my way of learning to build a website through agentic
                coding, working with AI agents to write and review the code. Most of
                what&apos;s here was built that way, one session at a time, a lot like
                the campaigns it records.
              </Typography>
              <Typography className={PROSE}>
                The code is public if you&apos;re curious how it&apos;s put together.
              </Typography>
              <div className="flex flex-wrap gap-3">
                <a
                  href={SOURCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses({ variant: "outline" })}
                >
                  View the code on GitHub
                </a>
                {ABOUT_EXTRAS.coffeeUrl && (
                  <a
                    href={ABOUT_EXTRAS.coffeeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses({ variant: "primary" })}
                  >
                    Buy me a coffee
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        <Typography className="pt-6 border-t divider text-[15px] leading-[1.6]" color="secondary">
          Questions or ideas? Use the{" "}
          <Link to="/contact" className="primary underline underline-offset-[3px]">
            contact page
          </Link>
          . How your data is handled is on the{" "}
          <Link to="/privacy" className="primary underline underline-offset-[3px]">
            privacy page
          </Link>
          .
        </Typography>
      </div>
    </div>
  </div>
);

export default AboutPage;
