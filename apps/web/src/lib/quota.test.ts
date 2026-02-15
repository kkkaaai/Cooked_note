import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUserPlan,
  getOrCreateUsageRecord,
  checkDocumentQuota,
  checkAIQuota,
  incrementDocumentUsage,
  incrementAIUsage,
} from "./quota";

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    subscription: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
    usageRecord: { upsert: (...args: unknown[]) => mockUpsert(...args) },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUpsert.mockResolvedValue({
    id: "usage-1",
    userId: "user-1",
    periodStart: new Date(),
    documentUploads: 0,
    aiRequests: 0,
  });
});

describe("getUserPlan", () => {
  it("returns free when no subscription exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    expect(await getUserPlan("user-1")).toBe("free");
  });

  it("returns free when subscription status is not active", async () => {
    mockFindUnique.mockResolvedValue({
      plan: "pro_monthly",
      status: "canceled",
      currentPeriodEnd: null,
    });
    expect(await getUserPlan("user-1")).toBe("free");
  });

  it("returns free when subscription period has expired", async () => {
    mockFindUnique.mockResolvedValue({
      plan: "pro_monthly",
      status: "active",
      currentPeriodEnd: new Date("2020-01-01"),
    });
    expect(await getUserPlan("user-1")).toBe("free");
  });

  it("returns plan when subscription is active and not expired", async () => {
    mockFindUnique.mockResolvedValue({
      plan: "pro_monthly",
      status: "active",
      currentPeriodEnd: new Date("2099-12-31"),
    });
    expect(await getUserPlan("user-1")).toBe("pro_monthly");
  });

  it("returns plan when active with no period end", async () => {
    mockFindUnique.mockResolvedValue({
      plan: "pro_yearly",
      status: "active",
      currentPeriodEnd: null,
    });
    expect(await getUserPlan("user-1")).toBe("pro_yearly");
  });
});

describe("getOrCreateUsageRecord", () => {
  it("upserts with current month start", async () => {
    const mockRecord = {
      id: "usage-1",
      userId: "user-1",
      periodStart: new Date(),
      documentUploads: 5,
      aiRequests: 3,
    };
    mockUpsert.mockResolvedValue(mockRecord);

    const result = await getOrCreateUsageRecord("user-1");
    expect(result).toEqual(mockRecord);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId_periodStart: expect.objectContaining({ userId: "user-1" }),
        }),
        create: expect.objectContaining({ userId: "user-1" }),
        update: {},
      })
    );
  });
});

describe("checkDocumentQuota", () => {
  it("returns null for pro users", async () => {
    mockFindUnique.mockResolvedValue({
      plan: "pro_monthly",
      status: "active",
      currentPeriodEnd: new Date("2099-12-31"),
    });
    expect(await checkDocumentQuota("user-1")).toBeNull();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns null when under free tier limit", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({ documentUploads: 2, aiRequests: 0 });
    expect(await checkDocumentQuota("user-1")).toBeNull();
  });

  it("returns error when at free tier limit", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({ documentUploads: 3, aiRequests: 0 });
    const error = await checkDocumentQuota("user-1");
    expect(error).toEqual({
      error: "quota_exceeded",
      resource: "documents",
      current: 3,
      limit: 3,
      plan: "free",
    });
  });

  it("returns error when over free tier limit", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({ documentUploads: 5, aiRequests: 0 });
    const error = await checkDocumentQuota("user-1");
    expect(error).toEqual({
      error: "quota_exceeded",
      resource: "documents",
      current: 5,
      limit: 3,
      plan: "free",
    });
  });
});

describe("checkAIQuota", () => {
  it("returns null for pro users", async () => {
    mockFindUnique.mockResolvedValue({
      plan: "pro_yearly",
      status: "active",
      currentPeriodEnd: null,
    });
    expect(await checkAIQuota("user-1")).toBeNull();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns null when under free tier limit", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({ documentUploads: 0, aiRequests: 9 });
    expect(await checkAIQuota("user-1")).toBeNull();
  });

  it("returns error when at free tier limit", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({ documentUploads: 0, aiRequests: 10 });
    const error = await checkAIQuota("user-1");
    expect(error).toEqual({
      error: "quota_exceeded",
      resource: "ai_requests",
      current: 10,
      limit: 10,
      plan: "free",
    });
  });
});

describe("incrementDocumentUsage", () => {
  it("upserts with increment", async () => {
    await incrementDocumentUsage("user-1");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "user-1",
          documentUploads: 1,
        }),
        update: { documentUploads: { increment: 1 } },
      })
    );
  });
});

describe("incrementAIUsage", () => {
  it("upserts with increment", async () => {
    await incrementAIUsage("user-1");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "user-1",
          aiRequests: 1,
        }),
        update: { aiRequests: { increment: 1 } },
      })
    );
  });
});
