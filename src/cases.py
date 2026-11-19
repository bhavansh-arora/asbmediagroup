"""Case-study data + template. build.py renders these into film-*.html."""
import json

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


def ratio_box(w, h):
    scale = 64 / max(w, h)
    return f'<span class="format__box"><i style="width:{w*scale:.0f}px;height:{h*scale:.0f}px"></i></span>'


def render(i):
    c = CASES[i]
    nxt = CASES[(i + 1) % len(CASES)]
    title = " ".join(c["title_lines"])
    poster = "film-mary-crop" if c["img"] == "film-mary" else c["img"]
    where = "\n".join(
        f"""          <div class="format" data-r style="--d:{k*0.05:.2f}s">
            {ratio_box(w, h)}
            <div><p class="mono accent">{r}</p><p>{label}</p></div>
          </div>""" for k, (r, label, w, h) in enumerate(c["where"]))
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

    <section class="section">
      <div class="wrap">
        <div class="rule"></div>
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
        <div class="formats">
{where}
        </div>
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
