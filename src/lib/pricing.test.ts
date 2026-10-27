import { describe, it, expect } from "vitest";
import { computeFees, holdAmount } from "./pricing";

describe("order pricing", () => {
  it("adds 15% tax on item prices", () => {
    expect(computeFees(100, 0).productTax).toBe(15);
  });
  it("charges 11% convenience on items plus tax", () => {
    expect(computeFees(100, 0).convenienceFee).toBe(12.65);
  });
  it("taxes delivery at 5% and adds no tax on convenience", () => {
    const f = computeFees(100, 10);
    expect(f.deliveryTax).toBe(0.5);
    expect(f.tax).toBe(15.5);
  });
  it("holds 25% above the estimated total", () => {
    expect(holdAmount(100)).toBe(125);
  });
});
