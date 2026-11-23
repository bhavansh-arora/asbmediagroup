"""Case-study data + template. build.py renders these into film-*.html."""
import json
import re

CASES = [
    {
        "slug": "film-mary-lees-house",
        "vimeo": "1209681619", "runtime": "04:03", "iso": "PT4M3S",
        "img": "film-mary", "title_lines": ["Mary Lee’s", "<em>House.</em>"], "name": "Mary Lee’s House",
        "client": "Mary Lee’s House", "industry": "Nonprofit · Child advocacy", "location": "Tampa, FL", "format": "Brand anthem film",
        "lede": "A dedicated look inside a child advocacy and protection centre, told with the care its mission deserves.",
        "brief": "Show how a multidisciplinary team provides a safe, centralised environment for child abuse assessment, intervention and healing, and make the impact of that work felt.",
        "approach": "Interview-led storytelling with the people who do the work, soft natural light and restrained, respectful framing. The building itself becomes a character: calm, safe and welcoming.",
        "audience": "Donors, community partners and local families. One film that can open a fundraising gala, anchor the website and travel through partner networks.",
        "pull": "Compassion first. Every frame had to protect the people it was about.",
        "where": [("16:9", "Website hero", 16, 9), ("16:9", "Donor & gala screenings", 16, 9), ("1:1", "Partner newsletters", 1, 1), ("9:16", "Awareness campaigns", 9, 16)],
        "tags": ["Interviews", "Documentary B-roll", "Colour grade", "Licensed score"],
        "desc": "Brand film for Mary Lee’s House, a Tampa child advocacy centre: a compassionate, interview-led story made for donors, partners and families.",
    },
    {
        "slug": "film-fun-bike-center",
        "vimeo": "1210003802", "runtime": "01:07", "iso": "PT1M7S",
        "img": "film-funbike", "title_lines": ["Fun Bike", "<em>Center.</em>"], "name": "Fun Bike Center",
        "client": "Fun Bike Center Motorsports", "industry": "Retail · Powersports", "location": "Lakeland, FL", "format": "Promotional showcase",
        "lede": "A high-energy showcase for Central Florida’s premier powersports dealership, built to make you want to ride.",
        "brief": "Capture the scale, thrill and passion of the powersports lifestyle: the sprawling showroom, the service operation and an inventory that runs from motorcycles and dirt bikes to ATVs and watercraft.",
        "approach": "Kinetic camera movement, punchy pacing and tight detail shots of chrome, tread and engines, cut against the people who make the place run. Big-scale wides establish authority; close-ups bring the adrenaline.",
        "audience": "Riders across Central Florida. Edited to perform on social, on digital channels and on the showroom floor screens.",
        "pull": "Make the showroom feel like the starting line.",
        "where": [("9:16", "Reels & TikTok", 9, 16), ("16:9", "YouTube & web", 16, 9), ("16:9", "Showroom displays", 16, 9), ("4:5", "Paid social", 4, 5)],
        "tags": ["Showroom", "Service bay", "Inventory hero shots", "Team on camera"],
        "desc": "Promotional showcase film for Fun Bike Center, Lakeland’s powersports dealership: scale, thrill and brand authority for social, digital and showroom screens.",
    },
    {
        "slug": "film-teco-energy-audit",
        "vimeo": "1210011258", "runtime": "00:29", "iso": "PT29S",
        "img": "film-teco", "title_lines": ["TECO energy", "<em>audit.</em>"], "name": "TECO Energy Audit",
        "client": "Tampa Electric (TECO)", "industry": "Utility · Energy", "location": "Tampa Bay, FL", "format": "Field feature",
        "lede": "Turning the technical work of utility energy analysts into a clear, human story customers can act on.",
        "brief": "Demystify how energy analysts evaluate residential and commercial efficiency, translate raw consumption data into conservation strategies, and connect customers with smart energy programmes.",
        "approach": "On-site field capture with real analysts and real customers. Clean, informative visuals walk through the audit process step by step and land on what matters most: real-world cost savings.",
        "audience": "Homeowners and businesses across the Tampa Bay area, met where they already are: on the web and in their feeds.",
        "pull": "If people understand it, they sign up for it.",
        "where": [("16:9", "Programme web pages", 16, 9), ("9:16", "Social awareness", 9, 16), ("1:1", "Customer emails", 1, 1), ("16:9", "Training & internal", 16, 9)],
        "tags": ["Field capture", "Process explainer", "Customer story", "On-screen graphics"],
        "desc": "Field feature for Tampa Electric (TECO) showing how utility energy audits work and the real savings they deliver to Tampa Bay homes and businesses.",
    },
    {
        "slug": "film-the-dance-room",
        "vimeo": "1209998926", "runtime": "01:26", "iso": "PT1M26S",
        "img": "film-dance", "title_lines": ["The Dance", "<em>Room.</em>"], "name": "The Dance Room",
        "client": "The Dance Room", "industry": "Lifestyle · Dance studio", "location": "Sarasota, FL", "format": "Brand film · Client interview",
        "lede": "An elegant, dynamic spotlight on Sarasota’s premier ballroom and Latin dance studio.",
        "brief": "Capture the energy, technique and welcoming atmosphere created by champion instructors, across beginner social lessons, wedding choreography, competitive coaching and youth classes.",
        "approach": "Graceful movement meets lively social sequences. Interview moments give the studio a voice, while flowing camera work shows off the spacious floor and the joy of learning to dance.",
        "audience": "Future dancers of every level, from first-timers and engaged couples to competitors, reached through the studio’s website and social platforms.",
        "pull": "Make the first lesson feel like an invitation, not a risk.",
        "where": [("16:9", "Website", 16, 9), ("9:16", "Instagram Reels", 9, 16), ("4:5", "Facebook feed", 4, 5), ("1:1", "Promotions", 1, 1)],
        "tags": ["Client interview", "Movement", "Atmosphere", "Social edits"],
        "desc": "Brand film for The Dance Room, Sarasota’s ballroom and Latin studio: energy, technique and a welcoming atmosphere for new dancers.",
    },
]



CASE_STILL = {"film-mary": ("film-mary-crop", "30% 30%"), "film-funbike": ("film-funbike-hero", "50% 30%"),
              "film-teco": ("film-teco", "52% 22%"), "film-dance": ("film-dance-hero", "50% 10%")}


def render(i):
    c = CASES[i]
    nxt = CASES[(i + 1) % len(CASES)]
    title = " ".join(c["title_lines"])
    poster = "film-mary-crop" if c["img"] == "film-mary" else c["img"]
    still, spos = CASE_STILL[c["img"]]
    where = devices(still, spos, c["where"], {"film-teco": "Tampa Electric"}.get(c["img"], c["name"]), wide_img=c["img"])
    tags = "".join(f'<span class="chip">{t}</span>' for t in c["tags"])
    schema = {
        "@context": "https://schema.org", "@type": "VideoObject", "name": c["name"], "description": c["desc"],
        "thumbnailUrl": f"https://www.asbmediagroup.com/assets/img/{c['img']}.webp", "uploadDate": "2026-08-01",
        "duration": c["iso"], "embedUrl": f"https://player.vimeo.com/video/{c['vimeo']}",
        "productionCompany": {"@type": "Organization", "name": "ASB Media Group"},
    }
    meta = {
        "title": f"{c['name']} — Case Study | ASB Media Group",
        "desc": c["desc"], "nav": "work", "og": f"assets/img/{c['img']}.webp",
        "schema": '<script type="application/ld+json">' + json.dumps(schema) + "</script>",
        "cta": "Your story, <em>next.</em>",
        "layout": "studio",
    }
    return f"""<!--meta {json.dumps(meta)} -->

    <header class="phead">
      <div class="wrap">
        <div class="eyebrow-row mono" data-r><a class="crumb" href="work.html">← All films</a><span>Case {i+1:02d} / {len(CASES):02d}</span></div>
        <div class="phead__grid">
          <h1 class="h1" data-r>{title}</h1>
          <div class="phead__aside" data-r style="--d:.08s"><p class="lead">{c["lede"]}</p></div>
        </div>
        <dl class="phead__meta" data-r style="--d:.12s">
          <div><dt class="mono">Client</dt><dd>{c["client"]}</dd></div>
          <div><dt class="mono">Industry</dt><dd>{c["industry"]}</dd></div>
          <div><dt class="mono">Location</dt><dd>{c["location"]}</dd></div>
          <div><dt class="mono">Format · Runtime</dt><dd>{c["format"]} · {c["runtime"]}</dd></div>
        </dl>
      </div>
    </header>

    <section>
      <div class="wrap">
        <button class="player" type="button" data-player="{c["vimeo"]}" data-title="{c["name"]}" aria-label="Play the {c["name"]} film" data-r>
          <img src="assets/img/{poster}.webp" alt="Still from the {c["name"]} film" fetchpriority="high" sizes="100vw"{' style="object-position:50% 32%"' if poster != c["img"] else ""}>
          <span class="player__ui"><span class="player__play"><span class="circle circle--solid">{{{{icon:play}}}}</span>Play the film</span><span class="mono">{c["runtime"]}</span></span>
        </button>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="eyebrow-row mono" data-r><span><span class="num">(01)</span> — The project</span><span>{c["format"]}</span></div>
        <div class="cols3">
          <div class="tile" data-r><p class="mono accent">The brief</p><p>{c["brief"]}</p></div>
          <div class="tile" data-r style="--d:.06s"><p class="mono accent">The approach</p><p>{c["approach"]}</p></div>
          <div class="tile" data-r style="--d:.12s"><p class="mono accent">Built for</p><p>{c["audience"]}</p></div>
        </div>
        <div class="chips" style="margin-top:18px" data-r>{tags}</div>
      </div>
    </section>

    <section class="section light">
      <div class="wrap">
        <div class="head" style="align-items:start">
          <p class="quote" data-r>“{c["pull"]}”</p>
          <div class="head__aside" data-r>
            <p class="mono" style="color:var(--faint)">The idea in one line</p>
            <p class="muted">Every ASB film starts with one sentence everyone agrees on. Every shot, cut and note of music answers to it.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="rule"></div>
        <div class="eyebrow-row mono" data-r><span><span class="num">(02)</span> — Where it works</span><span>One shoot · every screen</span></div>
{where}
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="next">
          <div class="next__text" data-r>
            <span class="mono" style="color:var(--faint)">Next film</span>
            <p class="h2">{" ".join(nxt["title_lines"])}</p>
            <p class="muted">{nxt["lede"]}</p>
            <a class="btn" href="{nxt["slug"]}.html"><span>Watch the case study</span><span class="btn__i">{{{{icon:arrow-ur}}}}</span></a>
          </div>
          <a class="mcard" href="{nxt["slug"]}.html" data-r style="--d:.08s">
            <span class="mcard__img" style="display:block;height:100%;min-height:320px"><img src="assets/img/{"film-mary-crop" if nxt["img"] == "film-mary" else nxt["img"]}.webp" alt="" loading="lazy" style="height:100%"></span>
            <span class="mcard__tag"><span class="dot"></span> {nxt["format"]} · {nxt["runtime"]}</span>
          </a>
        </div>
      </div>
    </section>
"""


def generate(pages_dir):
    for i, c in enumerate(CASES):
        (pages_dir / f"{c['slug']}.html").write_text(render(i))


# One shoot, every screen: each delivery format shown on the device it plays on (laptop, phone Reel,
# phone feed post, square post card, wall screen), each with its own crop and interface, all sitting on
# one baseline. Column widths are tuned so the devices come out at about the same height.
_SVG = {
    "play": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
    "heart": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
    "chat": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12Z"/></svg>',
    "send": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z"/></svg>',
    "save": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg>',
    "like": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 10v10H4V10h3Zm0 0 4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.8 20H7"/></svg>',
}
DEV_COLS = {"laptop": 2.1, "tv": 1.75, "reel": 0.62, "feed": 0.62, "post": 0.9}


def _handle(name):
    return re.sub(r"[^a-z0-9]", "", name.lower().replace("’", ""))


def devices(img, pos, items, name, wide_img=None, indent="        "):
    """img/pos: the still and its focal point; wide_img: an uncropped 16:9 version for the big screens."""
    wide = wide_img or img
    handle = _handle(name)
    domain = handle + ".com"
    kinds, seen = [], set()
    for r, *_ in items:
        k = {"9:16": "reel", "4:5": "feed", "1:1": "post"}.get(r) or ("tv" if "laptop" in seen else "laptop")
        seen.add(k)
        kinds.append(k)
    cols = " ".join(f"minmax(0,{DEV_COLS[k]}fr)" for k in kinds)
    pic = lambda src, cls="", sizes="40vw": (f'<img class="{cls}" src="assets/img/{src}.webp" alt="" loading="lazy" decoding="async" '
                                            f'sizes="(max-width: 640px) 60vw, {sizes}" style="object-position:{pos};--fo:{pos}">')
    av = f'<i class="dev__av">{name[0]}</i>'
    figs = []
    for n, ((r, label, *_), k) in enumerate(zip(items, kinds)):
        if k == "laptop":
            body = (f'<span class="lap"><span class="lap__lid"><span class="lap__screen">'
                    f'<span class="lap__bar"><i></i><i></i><i></i><span>{domain}</span></span>'
                    f'<span class="lap__page">{pic(wide, sizes="44vw")}<span class="lap__nav"><b>{name}</b><i></i><i></i><i></i></span>'
                    f'<span class="dev__play">{_SVG["play"]}</span><span class="dev__prog"><i></i></span></span>'
                    f'</span></span><span class="lap__base"></span></span>')
        elif k == "tv":
            body = (f'<span class="tv"><span class="tv__screen">{pic(wide, sizes="36vw")}'
                    f'<span class="tv__tag"><i></i>On screen · {name}</span><span class="dev__prog"><i></i></span></span>'
                    f'<span class="tv__stand"></span></span>')
        elif k == "reel":
            body = (f'<span class="ph"><span class="ph__screen ph__screen--reel">{pic(img, "is-tight", "16vw")}'
                    f'<span class="ph__island"></span><span class="reelui__top">Reels</span>'
                    f'<span class="reelui__side"><span>{_SVG["heart"]}<small>2.4k</small></span><span>{_SVG["chat"]}<small>86</small></span><span>{_SVG["send"]}</span></span>'
                    f'<span class="reelui__foot"><span class="reelui__who">{av}<b>@{handle}</b><em>Follow</em></span><i></i><i></i></span>'
                    f'</span></span>')
        elif k == "feed":
            body = (f'<span class="ph"><span class="ph__screen ph__screen--feed"><span class="ph__island"></span>'
                    f'<span class="feed__head">{av}<span><b>{handle}</b><small>Sponsored</small></span></span>'
                    f'<span class="feed__img">{pic(img, "", "16vw")}</span>'
                    f'<span class="feed__cta">Learn more<span>›</span></span>'
                    f'<span class="feed__acts">{_SVG["heart"]}{_SVG["chat"]}{_SVG["send"]}<span class="sp"></span>{_SVG["save"]}</span>'
                    f'<span class="feed__cap"><i></i><i></i></span>'
                    f'</span></span>')
        else:  # post
            body = (f'<span class="post"><span class="post__head">{av}<span><b>{name}</b><small>Promoted</small></span></span>'
                    f'<span class="post__txt"><i></i><i></i></span>'
                    f'<span class="post__img">{pic(img, "", "22vw")}<span class="dev__play">{_SVG["play"]}</span></span>'
                    f'<span class="post__acts"><span>{_SVG["like"]}Like</span><span>{_SVG["chat"]}Comment</span><span>{_SVG["send"]}Share</span></span>'
                    f'</span>')
        figs.append(f'{indent}  <figure class="dev dev--{k}" data-r style="--d:{n * 0.08:.2f}s"><span class="dev__body" aria-hidden="true">{body}</span>'
                    f'<figcaption><span class="mono accent">{r}</span><span>{label}</span></figcaption></figure>')
    nl = chr(10)
    return f'{indent}<div class="devs" style="grid-template-columns:{cols}">' + nl + nl.join(figs) + nl + f"{indent}</div>"


# The Services page shows the Fun Bike Center shoot across the four standard formats
SERVICES_WHERE = [("16:9", "Website, YouTube, presentations, TV", 16, 9), ("9:16", "Reels, TikTok, Shorts, Stories", 9, 16),
                  ("4:5", "Instagram and Facebook feed ads", 4, 5), ("1:1", "LinkedIn, email, marketplaces", 1, 1)]


def services_devices(indent="        "):
    return devices("film-funbike-hero", "50% 30%", SERVICES_WHERE, "Fun Bike Center", wide_img="film-funbike", indent=indent)
