import Link from "next/link";
import { Nav } from "@/components/Nav";
import { SprinkleRule } from "@/components/SprinkleRule";

const HALVES = [
  { stat: "Half", label: "the price", text: "A birthday treat that doesn't stretch the budget." },
  { stat: "Half", label: "the portion", text: "Sized for a child, so lunch still gets eaten." },
  { stat: "Half", label: "the sugar", text: "Finished with dye-free sprinkles." },
];

const STEPS = [
  {
    title: "Register once",
    text: "Enter your child's birthday and class. Two minutes, and only once — we carry your family forward each year.",
  },
  {
    title: "The date is set",
    text: "The celebration lands on a real school day, and appears on the shared calendar for the school and Manna Bakehouse.",
  },
  {
    title: "Manna Bakehouse delivers",
    text: "Mini doughnuts are baked that morning and brought straight to the classroom. Nothing for you to drop off.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />

      {/* Hero — the doughnut is the product, so it's shown properly rather than
          washed out. A large faded one appears further down as background. */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 md:pt-24">
        <div className="grid items-center gap-10 md:grid-cols-[1.08fr_.92fr]">
          <div>
            <p className="eyebrow">A Nourish to Flourish program</p>
            <h1 className="mt-4 text-[2.6rem] leading-[1.05] md:text-[3.7rem]">
              Just as fun.
              <span className="block text-berry">Half the doughnut.</span>
            </h1>
            <SprinkleRule width={300} className="mt-7" />
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
              Birthday doughnut celebrations are a lot of fun — but a regular doughnut is
              expensive and a very large portion, and children are often left with little
              appetite for lunch afterward.
            </p>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Manna Bakehouse makes mini doughnuts with dye-free sprinkles, and delivers
              them straight to school. Enter your child&rsquo;s birthday once and the rest
              is taken care of.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/register" className="btn-primary text-base">Register my child</Link>
              <span className="text-sm text-muted">Takes two minutes. No account needed.</span>
            </div>
          </div>

          <div className="relative order-first md:order-last">
            <img
              src="/donut.webp"
              alt="A mini doughnut with chocolate glaze and rainbow sprinkles"
              width={896}
              height={602}
              className="mx-auto w-full max-w-sm drop-shadow-sm md:max-w-none"
            />
          </div>
        </div>
      </section>

      {/* The three halves — the actual argument for the program */}
      <section className="mx-auto max-w-6xl px-5 pb-4">
        <div className="card p-7 md:p-9">
          <h2 className="text-2xl md:text-3xl">Why a mini doughnut</h2>
          <SprinkleRule width={120} className="mt-4" />
          <dl className="mt-9 grid gap-8 sm:grid-cols-3">
            {HALVES.map((h) => (
              <div key={h.label}>
                <dt className="font-display text-4xl leading-none">
                  {h.stat}{" "}
                  <span className="text-xl font-normal text-muted">{h.label}</span>
                </dt>
                <dd className="mt-3 leading-relaxed text-muted">{h.text}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 border-t border-line pt-6 leading-relaxed">
            Compared with a regular doughnut — so birthday celebrations stay just as
            fun, with a more balanced and affordable option.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="relative overflow-hidden border-y border-line bg-white">
        <img
          src="/donut.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-20 w-[560px] max-w-none
                     rotate-12 opacity-[0.07] md:-right-16 md:w-[720px]"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-16">
          <p className="font-display text-xl leading-snug">
            <span className="italic text-berry">&ldquo;My child didn&rsquo;t eat his lunch!&rdquo;</span>{" "}
            Nourish to Flourish is here to help.
          </p>
          <h2 className="mt-10 text-2xl md:text-3xl">How it works</h2>
          <SprinkleRule width={120} className="mt-4" />
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="eyebrow">Step {i + 1}</span>
                <h3 className="mt-2 text-xl">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="card relative overflow-hidden flex flex-col items-start gap-5 p-7 md:flex-row md:items-center md:justify-between">
          <img
            src="/donut.webp"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 -right-10 w-64 max-w-none
                       -rotate-12 opacity-[0.09]"
          />
          <div className="relative">
            <h3 className="text-xl">Sign up for mini doughnut delivery</h3>
            <p className="mt-1 text-muted">
              Enter your child&rsquo;s birthday once. Pay for the year up front, or before
              each birthday — your choice.
            </p>
          </div>
          <Link href="/register" className="btn-primary relative shrink-0">Register my child</Link>
        </div>
      </section>

      <footer className="border-t border-line py-10 text-center text-sm text-muted">
        A Nourish to Flourish program · Baked and delivered by Manna Bakehouse
        <br />
        <a href="mailto:nourishtoflourishevent@gmail.com"
          className="underline decoration-honey decoration-2 underline-offset-4">
          nourishtoflourishevent@gmail.com
        </a>
      </footer>
    </>
  );
}
