import { describe, expect, it } from "vitest";
import { getChannel } from "../src/channels.js";
import { addDuration, parseRuv } from "../src/sources/ruv.js";
import { parseSyn, type SynItem } from "../src/sources/syn.js";

const ruv = getChannel("ruv")!;
const syn = getChannel("syn")!;

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
