/**
 * Static mock data for the Narriva blog. Replaced by real CMS/database
 * content in a later phase — kept as full finished copy, not placeholder
 * text, since this is what readers actually see today.
 */

export const BLOG_CATEGORIES = [
  "Writing Craft",
  "Publishing Advice",
  "Author Spotlight",
  "Behind the Scenes",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export interface MockBlogPost {
  slug: string;
  title: string;
  category: BlogCategory;
  date: string;
  authorName: string;
  excerpt: string;
  coverColor: string;
  content: readonly string[];
}

export const MOCK_BLOG_POSTS: readonly MockBlogPost[] = [
  {
    slug: "how-to-know-when-your-manuscript-is-actually-ready-to-submit",
    title: "How to Know When Your Manuscript Is Actually Ready to Submit",
    category: "Writing Craft",
    date: "2026-05-02",
    authorName: "Funke Adisa",
    excerpt:
      "Most writers submit too early, not because the work is bad, but because finishing a draft feels identical to finishing a book. It isn't.",
    coverColor: "#1E3A8A",
    content: [
      "Most writers submit too early. Not because the work is bad — usually it isn't — but because finishing a draft feels identical to finishing a book, and it isn't the same thing at all. A draft is the proof that you can write the whole thing. A finished manuscript is proof that someone else should read it. Those are two different proofs, and the gap between them is where most submissions fail.",
      "Here is the test we actually use when a manuscript comes in: could the author explain, in two sentences, what the book is about and who it's for? Not the plot — the book. \"It's about a marriage\" is not an answer. \"It's about what a wife stops saying out loud after eleven years, and what happens when she starts again\" is. If you can't say it that specifically, you likely haven't finished discovering what you're writing about, and an editor will feel that gap on page one even if they can't name it.",
      "Second test: have you let it go cold? Every manuscript reads better the week you finish it than it does three months later, because three months later you're reading it instead of remembering writing it. If you haven't put real distance between yourself and the draft — at least four to six weeks, ideally longer — you are not reading your book. You're reading your intentions for your book, which is a much more forgiving document.",
      "Third: has anyone who isn't obligated to be kind to you read the whole thing? Writing groups are useful, but a writing group that loves you is not the same as a reader who doesn't know you and has no reason to finish your book except that it's good. If the only feedback you've gotten is from people who'll see you next Tuesday, you don't yet know if strangers will keep reading.",
      "Fourth, and this is the one nobody wants to hear: have you actually revised based on what that reading turned up, or did you defend the choices instead? There's a particular kind of writer who collects feedback like evidence for a trial they've already decided to win. If every piece of feedback you've gotten has a ready explanation for why the reader \"missed it,\" you haven't finished revising. You've finished arguing.",
      "None of this means a manuscript has to be perfect before it reaches us — we expect to do real editorial work on anything we acquire, and \"ready to submit\" doesn't mean \"ready to print.\" It means the book has been through enough rounds, enough cold readings, and enough honest revision that what we're evaluating is the actual book you're trying to write, not an early, excited draft of it. We can tell the difference immediately, and so, eventually, will every reader who picks it up.",
      "If you're not sure which side of that line you're on, that uncertainty is itself useful information. Sit with the manuscript a while longer. The book will still be there, and it will be a better use of everyone's time — yours included — when it's actually finished instead of just complete.",
    ],
  },
  {
    slug: "what-selective-publishing-actually-means",
    title: "What \"Selective Publishing\" Actually Means",
    category: "Behind the Scenes",
    date: "2026-04-18",
    authorName: "Wale Ogundipe",
    excerpt:
      "We say we're selective, and that word does a lot of unexamined work. Here's what actually happens to a manuscript between submission and a yes.",
    coverColor: "#B08D57",
    content: [
      "We say we're selective, and that word does a lot of unexamined work on our own marketing pages. It sounds like a synonym for \"discerning\" or, less charitably, like a polite way of saying \"hard to get into.\" Neither is quite what we mean. So here's what actually happens to a manuscript between the moment it lands in our inbox and the moment — much later, and much less often than you'd think — that it becomes a yes.",
      "Every submission gets read in full. Not a synopsis, not the first chapter with a skim of the rest — the whole manuscript, by an editor whose job that week is to find out whether this particular book is one we can publish well. That's the first filter, and it eliminates more manuscripts than any other step: not because they're poorly written, but because they're not finished, in the specific sense we wrote about in a different post entirely.",
      "What survives that first read goes to an acquisitions discussion, where the question changes. It's no longer \"is this good\" — by this point it usually is — but \"can we publish this better than it would be published elsewhere, and do we have a real plan for who reads it?\" That second half matters more than people assume. We've passed on manuscripts we genuinely admired because we couldn't picture, specifically, the reader who'd find it and the path that would get the book to them. Loving a manuscript and being the right publisher for it are different questions, and we try hard not to confuse our own enthusiasm for the second one.",
      "The manuscripts that pass both filters still don't all get an unconditional yes. A meaningful number get what we internally call a \"yes, if\" — a conditional offer tied to a specific, namable problem: the back third needs to be restructured, the protagonist's motivation in the middle act doesn't hold, the ending resolves a question the book never actually asked. We'd rather tell an author exactly what's missing and let them decide whether to do that work with us than pretend the manuscript is further along than it is.",
      "This is also, bluntly, why we publish fewer books than we could. Every book that goes out under our name is implicitly a claim about our judgment — to readers deciding whether to trust an unfamiliar author because we published them, and to the next author deciding whether to trust us with their manuscript. A publisher that says yes to everything isn't really making that claim anymore. It's just printing.",
      "None of this is a complicated secret. It's mostly just time — the time it takes to actually read something completely, discuss it honestly, and tell an author the truth instead of a more comfortable version of it. \"Selective\" isn't a brand position for us. It's just what's left over once you remove all the shortcuts.",
    ],
  },
  {
    slug: "self-publishing-vs-traditional-publishing-vs-what-we-do",
    title: "Self-Publishing vs. Traditional Publishing vs. What We Do",
    category: "Publishing Advice",
    date: "2026-03-27",
    authorName: "Funke Adisa",
    excerpt:
      "These aren't three points on the same line. They're three different trades — of money, control, and time — and most advice about choosing between them skips that part.",
    coverColor: "#2541B2",
    content: [
      "Most advice about choosing between self-publishing and traditional publishing treats it as a single axis — prestige on one end, control on the other, pick your spot. That framing skips the part that actually matters: each path is a different trade of money, control, and time, and the right answer depends on which of those three you have the least of.",
      "Self-publishing trades money for control. You pay for editing, design, and production out of your own pocket — or skip paying for them, which is the single most common reason self-published books struggle, not the absence of a publisher's name on the spine. In exchange, you keep every decision and every dollar of revenue. It's the right trade if you have the time to manage a production process yourself, the discipline to actually invest in editorial and design instead of skipping them, and a built-in audience or marketing plan that doesn't depend on a publisher's distribution.",
      "Traditional publishing trades control for infrastructure. A traditional house fronts the cost of editing, design, printing, and distribution, and in exchange takes the rights, the bulk of the margin, and most of the creative decisions — your cover, your title, sometimes your release date, are not really yours to decide. The advance, where one exists, is increasingly modest for most authors, and traditional houses publish so many titles per season that any individual book gets a fraction of a marketing team's actual attention. You're trading control for a machine that mostly runs without you, whether or not it's running in your book's favor.",
      "What we do sits deliberately between those two trades, and we built it that way on purpose rather than landing there by accident. We take fewer books than a traditional house would, which means each one gets actual attention instead of a slice of one. We charge a more direct economic relationship than a traditional advance-and-royalty structure, which means we're not making our margin primarily off volume — we're making it off books that work, which keeps our incentives pointed at your specific book rather than at our season's lineup. And we do the editorial and design work ourselves, in-house, by people who've actually shaped the kind of book you're writing, rather than assembling a patchwork of freelancers the way most self-published authors end up doing by necessity.",
      "This isn't the right model for everyone, and we'd rather say that plainly than pretend otherwise. If you have the time, discipline, and existing audience to self-publish well, you might keep more money and more control doing it yourself. If you're chasing the specific prestige of a major traditional imprint and you're willing to wait years and cede most creative control for the chance at it, that's a real and legitimate goal we're not set up to serve.",
      "What we're built for is the author who wants the editorial rigor and design quality of traditional publishing without disappearing into a list of two hundred other books that season — and who'd rather have a direct, honest conversation about cost and process than navigate either extreme alone. If that's the gap you're in, that's exactly the gap we built this for.",
    ],
  },
  {
    slug: "five-minutes-with-ifeoma-chukwu-on-writing-the-coast",
    title: "Five Minutes With Ifeoma Chukwu, On Writing the Coast",
    category: "Author Spotlight",
    date: "2026-03-12",
    authorName: "Wale Ogundipe",
    excerpt:
      "Ahead of What the River Kept, we asked Ifeoma Chukwu why she keeps returning to the same stretch of coastline, book after book.",
    coverColor: "#0F766E",
    content: [
      "Ifeoma Chukwu's third book, What the River Kept, is — like nearly everything she's written — set on the coast she grew up on, between Bonny and Port Harcourt. We asked her why she keeps going back.",
      "\"I don't think I keep going back,\" she said. \"I think I never left, on the page. I've lived in five cities since I was eighteen and none of them have shown up in a manuscript yet. I'm not sure they will.\"",
      "She's resistant to the idea that this is a limitation. \"People ask if I'll ever write somewhere else, the way you'd ask someone if they'll ever get a real job. The coast isn't a setting I keep reusing because I'm out of ideas. It's the only place I've ever understood well enough to be honest about. I'd rather write one place truthfully for thirty years than ten places I'm only pretending to know.\"",
      "What the River Kept took her nearly four years, partly because of how much research went into the dialect work. \"I wanted the sisters to sound like they were actually from there, not like a writer's idea of there. That took longer than the plot did, honestly. The plot I had in a weekend. The voice took years.\"",
      "Asked what's next, she's vague in the specific way that usually means she already knows. \"Same coast. Different decade. That's all I'll say.\"",
    ],
  },
  {
    slug: "ngozi-adeyemi-on-switching-from-literary-fiction-to-thriller",
    title: "Ngozi Adeyemi on Switching From Literary Fiction to Thriller",
    category: "Author Spotlight",
    date: "2026-02-20",
    authorName: "Funke Adisa",
    excerpt:
      "The Quiet Half was a quiet literary novel. The Currency of Small Lies is a thriller. We asked Ngozi Adeyemi what changed.",
    coverColor: "#7C2D12",
    content: [
      "The Quiet Half, Ngozi Adeyemi's debut, was a slow, interior novel about a marriage. The Currency of Small Lies, her second book, is a tense family thriller with a body in the second act. We asked what changed.",
      "\"Nothing changed, structurally, as much as people assume,\" she said. \"A thriller and a quiet domestic novel are both, underneath, about people protecting a version of themselves they've decided not to revise. The thriller just has a plot that makes that protection literally dangerous instead of just emotionally expensive.\"",
      "She says the genre shift was less a creative pivot and more a practical one. \"I had this family in my head — the inheritance dispute, the brother-in-law who goes missing — and it was never going to be a quiet book. Some stories tell you what they are if you actually listen instead of deciding in advance.\"",
      "Asked if she'll go back to literary fiction, she laughs. \"I think I never left. I just let the plot get louder this time.\"",
    ],
  },
  {
    slug: "the-difference-between-a-slow-opening-and-a-boring-one",
    title: "The Difference Between a Slow Opening and a Boring One",
    category: "Writing Craft",
    date: "2026-02-08",
    authorName: "Wale Ogundipe",
    excerpt:
      "\"Hook the reader in the first line\" is bad advice taken literally. The actual requirement is narrower, and easier to hit, than that.",
    coverColor: "#6D28D9",
    content: [
      "\"Hook the reader in the first line\" is advice that's right in spirit and wrong in the specific way that sends writers in the wrong direction. Taken literally, it produces openings that are loud instead of interesting — a gunshot, a death, a shocking confession, dropped in before we have any reason to care about who it's happening to.",
      "A slow opening isn't a problem. A boring one is. The difference isn't pace, it's whether the reader has a question they want answered. A slow opening that makes you wonder what a character is hiding, or what they're about to lose, will outlast a fast opening that has nothing underneath the noise.",
      "The actual requirement for a first page is narrower than \"hook the reader\": give them one specific thing to want to know. Not a mystery box, not necessarily a plot question — sometimes just a character whose next decision you're curious about. That's a much lower, much more achievable bar than \"open with an explosion,\" and it's the one we actually check for when a manuscript comes in.",
      "If your opening is slow and you're not sure it's working, don't ask whether something is happening. Ask whether a reader, three pages in, would have a question they're still waiting on you to answer. If yes, the slowness is doing its job.",
    ],
  },
  {
    slug: "what-an-isbn-actually-does-and-doesnt-do-for-you",
    title: "What an ISBN Actually Does (And Doesn't Do) For You",
    category: "Publishing Advice",
    date: "2026-01-22",
    authorName: "Funke Adisa",
    excerpt:
      "An ISBN is one of the most over-mystified parts of publishing. Here's what it actually is, in plain terms.",
    coverColor: "#92400E",
    content: [
      "An ISBN — International Standard Book Number — is, underneath the mystique, just a unique identifier so retailers, libraries, and distributors can all agree which book they're talking about. That's it. It does not protect your copyright. It does not mean anyone has reviewed your manuscript. It's closer to a barcode than a credential.",
      "What it does do: it lets your book appear correctly in bookstore and library catalog systems, gets sales tracked accurately across retailers, and signals, in a small but real way, that the book is being handled the way the industry expects a book to be handled. Each edition and format — hardcover, paperback, EPUB — technically needs its own ISBN, since the system identifies a specific edition, not just a title.",
      "Where the confusion usually comes from: people assume an ISBN registers your copyright or grants some legal protection. It doesn't do either. Copyright exists the moment you write the thing, registration or not. The ISBN is purely a logistics tool, not a legal one — useful, sometimes essential for distribution, but not the safeguard a lot of first-time authors assume it is.",
      "When we publish a book, we handle ISBN registration as part of production, across every format we're releasing. If you're self-publishing, you can buy one directly through your country's ISBN agency — it's not expensive, and you don't need a publisher to get one. You just need to know what you're actually buying.",
    ],
  },
  {
    slug: "why-our-editors-read-every-submission-twice",
    title: "Why Our Editors Read Every Submission Twice",
    category: "Behind the Scenes",
    date: "2026-01-10",
    authorName: "Wale Ogundipe",
    excerpt:
      "It slows us down, and we still do it. Here's the actual reasoning behind reading every manuscript we seriously consider a second time.",
    coverColor: "#161616",
    content: [
      "Every manuscript that makes it past a first read gets read again, in full, by the same editor, before it goes to an acquisitions discussion. This slows us down, noticeably, and we still do it, because the alternative produces worse decisions in a specific and predictable way.",
      "A first read is always partly a read of momentum — you're finding out what happens, and that discovery does some of the emotional work for you. A second read, once you already know what happens, tells you whether the writing is doing the work or the suspense was. Books that only work once tend to reveal that immediately on a second pass: the prose holds less weight than the plot did.",
      "It also catches a different kind of mistake — the manuscript you loved on a first read for reasons that have nothing to do with the book itself. Maybe it resembled something you'd just been thinking about, or the protagonist reminded you of someone, or you were simply in a good mood that week. A second, colder read is where those reactions get tested against the actual page.",
      "It costs us time we could spend reading new submissions instead. We've decided that trade is worth it, because a yes we got wrong costs an author far more than a slower no ever could.",
    ],
  },
  {
    slug: "killing-your-darlings-is-bad-advice",
    title: "Killing Your Darlings Is Bad Advice. Here's What We Tell Authors Instead.",
    category: "Writing Craft",
    date: "2025-12-15",
    authorName: "Funke Adisa",
    excerpt:
      "\"Kill your darlings\" gets repeated so often it's stopped meaning anything specific. We give authors a more useful question instead.",
    coverColor: "#1F2937",
    content: [
      "\"Kill your darlings\" gets repeated so often in writing advice that it's stopped meaning anything specific. Taken literally, it tells writers to distrust the parts of their own manuscript they care about most — which is, often, exactly backward. The sentence you love is sometimes the best one in the book.",
      "The actual problem the advice is gesturing at isn't affection. It's function. A passage doesn't earn its place by being well-written in isolation — it earns its place by doing something the book needs: moving the plot, revealing character, building the tone the ending needs to land. A gorgeous paragraph that isn't doing any of that is dead weight no matter how good the sentences are.",
      "So instead of \"kill your darlings,\" we ask authors a narrower question during edits: what is this passage doing, specifically, for the reader three chapters from now? Not \"is this good writing\" — almost everything an author loves enough to call a darling is, technically, good writing. The question is whether it's working, in this specific book, at this specific point.",
      "Sometimes the answer is yes, and the passage stays exactly as written, loved and functional both. Sometimes the answer is that it's doing something the book doesn't need anymore — often because an earlier draft needed it and a later one outgrew it. That's not a verdict on the writing. It's a question about architecture, and it's a much easier one to answer honestly than \"do I love this too much to be objective.\"",
    ],
  },
  {
    slug: "a-week-in-the-life-of-our-design-team",
    title: "A Week in the Life of Our Design Team",
    category: "Behind the Scenes",
    date: "2025-11-30",
    authorName: "Wale Ogundipe",
    excerpt:
      "Cover design looks, from the outside, like one good idea arriving fully formed. From the inside, it looks like this.",
    coverColor: "#B08D57",
    content: [
      "Cover design looks, from the outside, like one good idea arriving fully formed — a designer has a flash of inspiration, and there's the cover. From the inside, in a typical week, it looks considerably less romantic and considerably more like research.",
      "Monday and Tuesday are usually reading and reference-gathering — not just the manuscript, but the genre's actual shelf, current and historical, so a new cover knows what it's standing next to. We pull twenty to thirty comparable covers before sketching anything, partly to find what's overused and partly to find what's missing.",
      "Wednesday is concepting — usually three to five genuinely different directions, not three versions of the same idea with different colors. By Thursday we've internally narrowed to one or two directions worth showing the author, and Friday is typically revisions on whichever direction got traction, plus typesetting work on whatever interior layouts are mid-process.",
      "The part that surprises people most: a cover that looks instantly obvious in the final file usually went through four or five discarded directions to get there. The \"obvious\" choice is almost never the first one anyone had.",
    ],
  },
];

export function getBlogPostBySlug(slug: string): MockBlogPost | undefined {
  return MOCK_BLOG_POSTS.find((post) => post.slug === slug);
}
