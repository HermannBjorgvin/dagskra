import { describe, expect, it } from "vitest";
import { nowNext, windowDates } from "../src/cache.js";
import { getChannel } from "../src/channels.js";
import type { Program } from "../src/schema.js";
import { parseAlthingi } from "../src/sources/althingi.js";
import { addDuration, parseRuv } from "../src/sources/ruv.js";
import { parseSyn, type SynItem } from "../src/sources/syn.js";

const ruv = getChannel("ruv")!;
const syn = getChannel("syn")!;
const althingi = getChannel("althingi")!;

// Trimmed from a real muninn response (2026-05-23).
const RUV_XML = `<?xml version="1.0" encoding="utf-8" ?>
<schedule saved="2026-05-23 23:06" saved-by="Kringla 3.1" xml-version="2.8.0">
  <service service-id="1" service-name="RÚV" date="2026-05-23">
    <event event-id="5444747" serie-id="34361" start-time="2026-05-23 07:00:00" duration="03:00:00" mark="no">
      <title>KrakkaRÚV</title>
      <original-title />
      <description><![CDATA[]]></description>
      <rating />
      <episode number="145" number-of-episodes="200" />
      <live>no</live>
      <rerun>no</rerun>
      <category value="1">Börn</category>
      <details id="34361">
        <series-description>Barnaefni RÚV.</series-description>
        <episode-description />
      </details>
    </event>
    <event event-id="5444748" serie-id="40000" start-time="2026-05-23 10:00:00" duration="00:30:00" mark="no">
      <title>Endursýning</title>
      <live>no</live>
      <rerun>yes</rerun>
      <category value="2">Fréttir</category>
    </event>
  </service>
</schedule>`;

// Trimmed from a real syn.is response (2026-05-23).
const SYN_ITEMS: SynItem[] = [
  {
    upphaf: "2026-05-23T07:00:00Z",
    slotlengd: "00:05",
    titill: "Mikki og Brynja",
    isltitill: "Söguhúsið",
    undirtitill: "Mikki og Brynja",
    lysing: "Vinir hittast í leynilegu tréhúsi.",
    seria: 1,
    thattur: 12,
    thattafjoldi: 26,
    beint: 0,
    frumsyning: 0,
    flokkur: "Children",
    bannad: "Green",
  },
];

describe("addDuration", () => {
  it("adds HH:MM:SS", () => {
    expect(addDuration("2026-05-23T07:00:00Z", "03:00:00")).toBe("2026-05-23T10:00:00Z");
  });
  it("adds HH:MM", () => {
    expect(addDuration("2026-05-23T07:00:00Z", "00:05")).toBe("2026-05-23T07:05:00Z");
  });
});

describe("parseRuv", () => {
  const programs = parseRuv(RUV_XML, ruv);
  it("extracts each event as a normalized program", () => {
    expect(programs).toHaveLength(2);
  });
  it("maps fields correctly", () => {
    const p = programs[0];
    expect(p).toMatchObject({
      channel: "ruv",
      station: "RÚV",
      start: "2026-05-23T07:00:00Z",
      end: "2026-05-23T10:00:00Z",
      title: "KrakkaRÚV",
      category: "Börn",
      live: undefined,
    });
    expect(p.series).toEqual({ episode: 145, total: 200 });
    expect(p.description).toBe("Barnaefni RÚV."); // falls back to series-description
  });
  it("maps rerun from <rerun>, leaving it unset for non-repeats", () => {
    expect(programs[0].rerun).toBeUndefined(); // <rerun>no</rerun>
    expect(programs[1].rerun).toBe(true); // <rerun>yes</rerun>
  });
});

describe("parseSyn", () => {
  const programs = parseSyn(SYN_ITEMS, syn);
  it("maps fields correctly", () => {
    const p = programs[0];
    expect(p).toMatchObject({
      channel: "syn",
      station: "Sýn",
      start: "2026-05-23T07:00:00Z",
      end: "2026-05-23T07:05:00Z",
      title: "Söguhúsið", // isltitill preferred
      originalTitle: "Mikki og Brynja",
      category: "Children",
      rating: "Green",
    });
    expect(p.series).toEqual({ season: 1, episode: 12, total: 26 });
  });
});

// Decoded from the real althingi.is feed (the live feed is ISO-8859-1).
const ALTHINGI_XML = `<?xml version="1.0" encoding="iso-8859-1"?>
<textavarp>
<fundur>
<fundarnúmer>110. fundur</fundarnúmer>
<dagur>þriðjudagur</dagur>
<dagsetning>26.5.2026</dagsetning>
<tími>kl. 13:30</tími>
<dagskrárliður>
<númer>1</númer><heiti>Óundirbúinn fyrirspurnatími</heiti></dagskrárliður>
<dagskrárliður>
<númer>2</númer><heiti>Þjóðaratkvæðagreiðsla um aðild að ESB</heiti></dagskrárliður>
</fundur>
<fréttir>
</fréttir>
</textavarp>`;

describe("parseAlthingi", () => {
  const programs = parseAlthingi(ALTHINGI_XML, althingi);
  it("maps a sitting to a normalized program", () => {
    expect(programs).toHaveLength(1);
    expect(programs[0]).toMatchObject({
      channel: "althingi",
      station: "Alþingi",
      start: "2026-05-26T13:30:00Z", // "26.5.2026" + "kl. 13:30", Iceland = UTC
      title: "Þingfundur – 110. fundur",
      category: "Þingfundur",
    });
  });
  it("folds the agenda items into the description", () => {
    expect(programs[0].description).toBe(
      "1. Óundirbúinn fyrirspurnatími; 2. Þjóðaratkvæðagreiðsla um aðild að ESB",
    );
  });
});

describe("windowDates", () => {
  it("returns yesterday, the day, and tomorrow", () => {
    expect(windowDates(new Date("2026-05-24T00:05:00Z"))).toEqual([
      "2026-05-23",
      "2026-05-24",
      "2026-05-25",
    ]);
  });
  it("crosses month boundaries", () => {
    expect(windowDates(new Date("2026-06-01T00:30:00Z"))).toEqual([
      "2026-05-31",
      "2026-06-01",
      "2026-06-02",
    ]);
  });
});

describe("nowNext", () => {
  // The merged window whats_on assembles: a programme spanning midnight (from the
  // day before) followed by the first programme of the next day.
  const programs: Program[] = [
    { channel: "ruv", station: "RÚV", start: "2026-05-23T23:30:00Z", end: "2026-05-24T00:30:00Z", title: "Næturvakt" },
    { channel: "ruv", station: "RÚV", start: "2026-05-24T00:30:00Z", end: "2026-05-24T06:00:00Z", title: "Dagskrárlok" },
  ];

  it("finds a programme that started yesterday and runs past midnight", () => {
    const { now, next } = nowNext(programs, new Date("2026-05-24T00:15:00Z"));
    expect(now?.title).toBe("Næturvakt");
    expect(next?.title).toBe("Dagskrárlok");
  });

  it("finds tomorrow's first programme as next, late at night", () => {
    const { now, next } = nowNext(programs, new Date("2026-05-23T23:55:00Z"));
    expect(now?.title).toBe("Næturvakt");
    expect(next?.title).toBe("Dagskrárlok");
  });
});

describe("parseSyn end without slotlengd", () => {
  it("borrows the next programme's start when slotlengd is missing", () => {
    const items: SynItem[] = [
      { upphaf: "2026-05-23T20:00:00Z", titill: "A" }, // no slotlengd
      { upphaf: "2026-05-23T21:30:00Z", slotlengd: "00:30", titill: "B" },
    ];
    const ps = parseSyn(items, syn);
    expect(ps[0].end).toBe("2026-05-23T21:30:00Z"); // next item's start
    expect(ps[1].end).toBe("2026-05-23T22:00:00Z"); // its own slotlengd
  });
  it("falls back to start for the day's last item with no slotlengd", () => {
    const ps = parseSyn([{ upphaf: "2026-05-23T23:00:00Z", titill: "Last" }], syn);
    expect(ps[0].end).toBe("2026-05-23T23:00:00Z");
  });
});
