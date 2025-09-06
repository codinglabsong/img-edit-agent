import { render, screen, fireEvent } from "@testing-library/react";
import ImagePreview from "./image-preview";

describe("ImagePreview", () => {
  it("shows placeholder when no image", () => {
    render(<ImagePreview imageUrl={null} />);
    expect(
      screen.getByText(/your image will appear here/i),
    ).toBeInTheDocument();
  });

  it("renders image when url provided", () => {
    render(<ImagePreview imageUrl="https://example.com/test.png" />);
    const img = screen.getByAltText("Generated image");
    expect(img).toBeInTheDocument();
  });

  it("shows error message on image error", () => {
    render(<ImagePreview imageUrl="https://example.com/test.png" />);
    const img = screen.getByAltText("Generated image");
    fireEvent.error(img);
    expect(screen.getByText(/failed to load image/i)).toBeInTheDocument();
  });
});
