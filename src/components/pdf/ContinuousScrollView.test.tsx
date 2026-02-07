import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { ContinuousScrollView } from "./ContinuousScrollView";
import { usePDFStore } from "@/stores/pdf-store";

// Mock IntersectionObserver (not available in jsdom)
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor() {}
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

// Mock react-pdf
vi.mock("react-pdf", () => ({
  Page: ({ pageNumber, children }: { pageNumber: number; children?: React.ReactNode }) => (
    <div className="react-pdf__Page" data-testid={`page-${pageNumber}`}>
      Page {pageNumber}
      {children}
    </div>
  ),
}));

// Mock child components
vi.mock("./HighlightLayer", () => ({
  HighlightLayer: ({ pageNumber }: { pageNumber: number }) => (
    <div data-testid={`highlight-layer-${pageNumber}`} />
  ),
}));

vi.mock("./RegionSelectOverlay", () => ({
  RegionSelectOverlay: () => <div data-testid="region-select-overlay" />,
}));

describe("ContinuousScrollView", () => {
  const containerRef = { current: document.createElement("div") };

  beforeEach(() => {
    usePDFStore.getState().reset();
  });

  it("renders page wrappers with data-page-number attributes", () => {
    const { container } = render(
      <ContinuousScrollView
        numPages={5}
        scale={1}
        containerRef={containerRef}
        isAIMode={false}
        isSelecting={false}
        selectionRect={null}
        activeRegionPage={null}
      />
    );

    const wrappers = container.querySelectorAll("[data-page-number]");
    expect(wrappers).toHaveLength(5);
    expect(wrappers[0].getAttribute("data-page-number")).toBe("1");
    expect(wrappers[4].getAttribute("data-page-number")).toBe("5");
  });

  it("renders pages within buffer range", () => {
    const { container } = render(
      <ContinuousScrollView
        numPages={10}
        scale={1}
        containerRef={containerRef}
        isAIMode={false}
        isSelecting={false}
        selectionRect={null}
        activeRegionPage={null}
      />
    );

    // Default visible is page 1, buffer is +/-2, so pages 1-3 should render
    const renderedPages = container.querySelectorAll(".react-pdf__Page");
    expect(renderedPages.length).toBeGreaterThan(0);
    expect(renderedPages.length).toBeLessThanOrEqual(5); // 1 + buffer of 2
  });

  it("renders HighlightLayer for each rendered page", () => {
    const { getAllByTestId } = render(
      <ContinuousScrollView
        numPages={3}
        scale={1}
        containerRef={containerRef}
        isAIMode={false}
        isSelecting={false}
        selectionRect={null}
        activeRegionPage={null}
      />
    );

    const highlightLayers = getAllByTestId(/highlight-layer/);
    expect(highlightLayers.length).toBeGreaterThan(0);
  });

  it("renders RegionSelectOverlay only on activeRegionPage when in AI mode", () => {
    const { queryByTestId } = render(
      <ContinuousScrollView
        numPages={3}
        scale={1}
        containerRef={containerRef}
        isAIMode={true}
        isSelecting={true}
        selectionRect={{ x: 0.1, y: 0.1, width: 0.5, height: 0.3 }}
        activeRegionPage={2}
      />
    );

    expect(queryByTestId("region-select-overlay")).toBeInTheDocument();
  });

  it("does not render RegionSelectOverlay when not in AI mode", () => {
    const { queryByTestId } = render(
      <ContinuousScrollView
        numPages={3}
        scale={1}
        containerRef={containerRef}
        isAIMode={false}
        isSelecting={false}
        selectionRect={null}
        activeRegionPage={null}
      />
    );

    expect(queryByTestId("region-select-overlay")).not.toBeInTheDocument();
  });

  it("renders vertical flex container with gap", () => {
    const { container } = render(
      <ContinuousScrollView
        numPages={3}
        scale={1}
        containerRef={containerRef}
        isAIMode={false}
        isSelecting={false}
        selectionRect={null}
        activeRegionPage={null}
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("flex-col");
    expect(wrapper.className).toContain("gap-4");
  });
});
