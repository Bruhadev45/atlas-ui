import { describe, expect, it } from "vitest";
import { matchesAccept, validateFiles } from "./file-validation";

function file(name: string, type: string, bytes = 4): File {
  return new File(["x".repeat(bytes)], name, { type });
}

const pdf = file("filing.pdf", "application/pdf");
const png = file("chart.png", "image/png");
const csv = file("rows.csv", "text/csv");

describe("matchesAccept", () => {
  const cases: [string, File, string | undefined, boolean][] = [
    ["undefined accepts everything", pdf, undefined, true],
    ["empty string accepts everything", pdf, "", true],
    ["exact mime match", pdf, "application/pdf", true],
    ["exact mime miss", png, "application/pdf", false],
    ["wildcard subtype match", png, "image/*", true],
    ["wildcard subtype miss", pdf, "image/*", false],
    ["*/* matches", pdf, "*/*", true],
    ["extension match", csv, ".csv", true],
    ["extension match is case-insensitive", file("ROWS.CSV", ""), ".csv", true],
    ["extension miss", pdf, ".csv", false],
    ["a list matches on any token", png, "application/pdf,image/*", true],
    ["a list rejects when no token matches", csv, "application/pdf,image/*", false],
    ["whitespace around tokens is ignored", png, " application/pdf , image/* ", true],
    ["a typeless file still matches by extension", file("a.pdf", ""), ".pdf", true],
    ["a typeless file misses a mime token", file("a.pdf", ""), "application/pdf", false],
  ];

  it.each(cases)("%s", (_label, candidate, accept, expected) => {
    expect(matchesAccept(candidate, accept)).toBe(expected);
  });
});

describe("validateFiles", () => {
  it("accepts everything when no constraints are given", () => {
    const result = validateFiles([pdf, png]);
    expect(result.accepted).toEqual([pdf, png]);
    expect(result.rejected).toEqual([]);
  });

  it("rejects the wrong type with reason 'type'", () => {
    const result = validateFiles([pdf, png], { accept: "application/pdf" });
    expect(result.accepted).toEqual([pdf]);
    expect(result.rejected).toEqual([{ file: png, reason: "type" }]);
  });

  it("rejects an oversize file with reason 'size'", () => {
    const big = file("big.pdf", "application/pdf", 100);
    const result = validateFiles([pdf, big], { maxFileSize: 10 });
    expect(result.accepted).toEqual([pdf]);
    expect(result.rejected).toEqual([{ file: big, reason: "size" }]);
  });

  it("treats maxFileSize as inclusive", () => {
    const exact = file("exact.pdf", "application/pdf", 10);
    expect(validateFiles([exact], { maxFileSize: 10 }).accepted).toEqual([exact]);
  });

  it("rejects past maxFiles with reason 'count'", () => {
    const result = validateFiles([pdf, png, csv], { maxFiles: 2 });
    expect(result.accepted).toEqual([pdf, png]);
    expect(result.rejected).toEqual([{ file: csv, reason: "count" }]);
  });

  it("counts the attachments the consumer already holds", () => {
    const result = validateFiles([pdf, png], { maxFiles: 2, currentCount: 1 });
    expect(result.accepted).toEqual([pdf]);
    expect(result.rejected).toEqual([{ file: png, reason: "count" }]);
  });

  it("reports the type reason first when a file breaks several rules at once", () => {
    const big = file("big.png", "image/png", 100);
    const result = validateFiles([big], { accept: "application/pdf", maxFileSize: 10, maxFiles: 0 });
    expect(result.rejected).toEqual([{ file: big, reason: "type" }]);
  });

  it("does not spend the count budget on files it rejected", () => {
    const wrong = file("no.png", "image/png");
    const result = validateFiles([wrong, pdf], { accept: "application/pdf", maxFiles: 1 });
    expect(result.accepted).toEqual([pdf]);
    expect(result.rejected).toEqual([{ file: wrong, reason: "type" }]);
  });

  it("returns new arrays and never mutates the input", () => {
    const input = [pdf, png];
    const result = validateFiles(input, { accept: "application/pdf" });
    expect(input).toEqual([pdf, png]);
    expect(result.accepted).not.toBe(input);
  });
});
