const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1">
  <filter id="tf-chromium-bug-41483538-filter" color-interpolation-filters="sRGB">
    <feColorMatrix type="matrix" values="-1.0986 -0.2556 1.5646 0.0146 0 -0.3103 -1.8658 2.6509 0.0109 0 -0.3976 1.8096 -0.734 0.0035 0 0 0 0 1 0"></feColorMatrix>
  </filter>
  <rect filter="url(#tf-chromium-bug-41483538-filter)" width="1" height="1" fill="#0ca7da"></rect>
</svg>
`;

const KNOWN_P3_TRANSFORMED_RGB = [255, 255, 153];

export async function detectChromeFeColorMatrixBug() {
  const p3Canvas = document.createElement("canvas");
  p3Canvas.width = 1;
  p3Canvas.height = 1;
  const p3Ctx = p3Canvas.getContext("2d", { colorSpace: "display-p3" });
  if (!p3Ctx) {
    return false;
  }
  const p3CtxColorSpace = p3Ctx?.getContextAttributes?.().colorSpace;
  if (p3CtxColorSpace !== "display-p3") {
    return false;
  }
  const img = new Image();
  img.src = "data:image/svg+xml," + encodeURIComponent(SVG);
  await new Promise((resolve) => (img.onload = resolve));
  p3Ctx.drawImage(img, 0, 0);
  const p3Data = p3Ctx.getImageData(0, 0, 1, 1).data;
  return (
    p3Data[0] !== KNOWN_P3_TRANSFORMED_RGB[0] ||
    p3Data[1] !== KNOWN_P3_TRANSFORMED_RGB[1] ||
    p3Data[2] !== KNOWN_P3_TRANSFORMED_RGB[2]
  );
}
