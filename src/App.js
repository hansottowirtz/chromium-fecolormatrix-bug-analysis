import "./App.css";
import { useEffect, useId, useState } from "react";
import { detectChromeFeColorMatrixBug } from "./detect-chrome-fecolormatrix-bug";

const AVIF_1X1_HDR_BASE64 =
  "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUEAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABkAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgSAAAAAAABNjb2xybmNseAAJABIACYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACFtZGF0EgAKBzgABhCRIJkyDBZABhhhhAAAeUzRyg==";

function ProblematicSvg({ children }) {
  const id = useId();

  return (
    <Svg>
      <defs>
        <filter
          id={`filter-${id}`}
          filterUnits="objectBoundingBox"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feColorMatrix
            type="matrix"
            values="-1.0986 -0.2556 1.5646 0.0146 0 -0.3103 -1.8658 2.6509 0.0109 0 -0.3976 1.8096 -0.734 0.0035 0 0 0 0 1 0"
          ></feColorMatrix>
        </filter>
      </defs>
      <circle
        cx="100"
        cy="100"
        r="100"
        id="circle"
        fill="#0ca7da"
        filter={`url(#filter-${id})`}
      />
      {children}
    </Svg>
  );
}

function HdrPixel() {
  return <image href={AVIF_1X1_HDR_BASE64} x="0" y="0" width="1" height="1" />;
}

function App() {
  return (
    <div className="App" style={{ margin: 8 }}>
      <div style={{ margin: 10 }}>
        This is a small analysis of{" "}
        <a
          target="_blank"
          rel="noreferrer"
          href="https://issues.chromium.org/issues/41483538"
        >
          Chromium bug #41483538
        </a>
        .
      </div>
      <div style={{ margin: 10 }}>
        Summary: Chromium has a bug where SVG feColorMatrix filters are wrongly
        rendered on Display P3 screens.
      </div>
      <div style={{ margin: 10 }}>
        <DetectBug />
        <DetectP3Screen />
      </div>
      <div
        style={{
          margin: 10,
          paddingBottom: 10,
          borderBottom: "1px lightgray solid",
        }}
      >
        <div>Base SVG:</div>
        <CodeBlock>
          {`
<svg>
  <circle cx="100" cy="100" r="100" fill="#0ca7da" />
</svg>
          `}
        </CodeBlock>
        <Svg>
          <circle cx="100" cy="100" r="100" id="circle" fill="#0ca7da" />
        </Svg>
      </div>
      <div
        style={{
          margin: 10,
          paddingBottom: 10,
          borderBottom: "1px lightgray solid",
        }}
      >
        <div>SVG with feColorMatrix filter:</div>
        <CodeBlock>
          {`
<svg>
  <defs>
    <filter
      id="filter"
      filterUnits="objectBoundingBox"
      primitiveUnits="userSpaceOnUse"
      color-interpolation-filters="sRGB"
    >
      <feColorMatrix
        type="matrix"
        values="-1.0986 -0.2556 1.5646 0.0146 0 -0.3103 -1.8658 2.6509 0.0109 0 -0.3976 1.8096 -0.734 0.0035 0 0 0 0 1 0"
      ></feColorMatrix>
    </filter>
  </defs>
  <circle cx="100" cy="100" r="100" fill="#0ca7da" filter="url(#filter)" />
</svg>
          `}
        </CodeBlock>
        <ProblematicSvg />
        <div>
          This will look green on Chromium on Display P3 screens, and yellow
          otherwise.
        </div>
      </div>
      <div
        style={{
          margin: 10,
          paddingBottom: 10,
          borderBottom: "1px lightgray solid",
        }}
      >
        <div>SVG with feColorMatrix filter, drawn to sRGB canvas:</div>
        <CodeBlock>
          {`
          canvas.getContext("2d", { colorSpace: "srgb" }) // default colorSpace
          `}
        </CodeBlock>
        <DrawToCanvas colorSpace={"srgb"}>
          <ProblematicSvg />
        </DrawToCanvas>
        <div>
          This should look yellow on all browsers, regardless of the screen
        </div>
      </div>
      <div
        style={{
          margin: 10,
          paddingBottom: 10,
          borderBottom: "1px lightgray solid",
        }}
      >
        <div>SVG with feColorMatrix filter, drawn to Display P3 canvas:</div>
        <CodeBlock>
          {`
          canvas.getContext("2d", { colorSpace: "display-p3" })
          `}
        </CodeBlock>
        <DrawToCanvas colorSpace={"display-p3"}>
          <ProblematicSvg />
        </DrawToCanvas>
        <div>
          This should look green in "buggy" Chromium, regardless of the screen,
          and yellow in other browsers
        </div>
      </div>
      <div
        style={{
          margin: 10,
          paddingBottom: 10,
          borderBottom: "1px lightgray solid",
        }}
      >
        <div>
          We can detect the bug by checking the image data of this canvas.
        </div>
        <CodeBlock>
          {`
const KNOWN_P3_TRANSFORMED_RGB = [255, 255, 153];
const ctx = canvas.getContext("2d", { colorSpace: "display-p3" });
const img = new Image();
img.src = "data:image/svg+xml," + encodeURIComponent(SVG_WITH_COLORMATRIX);
ctx.drawImage(img, 0, 0);
const p3Data = ctx.getImageData(0, 0, 1, 1).data;
const hasBug = compareColors(p3Data, KNOWN_P3_TRANSFORMED_RGB);
          `}
        </CodeBlock>
        <DetectBug />
      </div>
      <div
        style={{
          margin: 10,
          paddingBottom: 10,
          borderBottom: "1px lightgray solid",
        }}
      >
        <div>
          It seems that adding an image with an HDR colorspace forces Chromium
          to render the SVG correctly. The downside is that this might cause
          brightness flickers on some screens (e.g. MacBooks).
        </div>
        <div>
          To generate a 1x1 pixel image in HDR format (BT.2100), we can use this
          bash script:
        </div>
        <CodeBlock>
          {`
#!/bin/bash

# generate a 1x1 pixel image
magick xc:black 1x1-base.jpeg
# give it color profile BT.2100
avifenc 1x1-base.jpeg --cicp 9/18/9 1x1-hdr.avif
# encode as base64
base64var=$(cat 1x1-hdr.avif | base64)
# echo
echo "data:image/avif;base64,$base64var"
`}
        </CodeBlock>
        <div>This way, we get the following 435-byte base64 image:</div>
        <CodeBlock>{AVIF_1X1_HDR_BASE64}</CodeBlock>
      </div>
      <div
        style={{
          margin: 10,
          paddingBottom: 10,
          borderBottom: "1px lightgray solid",
        }}
      >
        <div>Adding the HDR pixel:</div>
        <CodeBlock>
          {`
<svg>
  ...
  <image href="data:image/avif;base64,AAAAIGZ0eX..." x="0" y="0" width="1" height="1" />
</svg>
        `}
        </CodeBlock>
        <ToggleDiv>
          <ProblematicSvg>
            <HdrPixel />
          </ProblematicSvg>
        </ToggleDiv>
        <div>
          This SVG should now be yellow, regardless of screen and browser.
        </div>
      </div>
      <div
        style={{
          margin: 10,
          paddingBottom: 10,
          borderBottom: "1px lightgray solid",
        }}
      >
        <div>SVG with HDR pixel drawn to a P3 canvas</div>
        <DrawToCanvas colorSpace={"display-p3"}>
          <ProblematicSvg>
            <HdrPixel />
          </ProblematicSvg>
        </DrawToCanvas>
        <div>
          Unfortunately, this will still look green on "buggy" Chromium,
          regardless of the screen.
        </div>
      </div>
    </div>
  );
}

export default App;

function CodeBlock({ children }) {
  return (
    <div
      style={{
        margin: "8px 0",
        background: "lightgray",
        padding: 16,
        whiteSpace: "pre-wrap",
        fontFamily: "monospace",
        overflow: "auto",
      }}
    >
      {children.trim()}
    </div>
  );
}

function Svg({ children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      baseProfile="full"
      version="1.1"
      viewBox="0 0 200 200"
      width="200"
    >
      {children}
    </svg>
  );
}

function DetectBug() {
  const [hasBug, setHasBug] = useState(null);
  useEffect(() => {
    detectChromeFeColorMatrixBug().then(setHasBug);
  }, []);
  return (
    <div
      style={{
        margin: "10px 0",
        padding: 16,
        background:
          hasBug === null ? "lightgray" : hasBug ? "lightgreen" : "lightcoral",
      }}
    >
      Does your browser have the bug?
      <br />
      {hasBug === null ? "Loading..." : hasBug ? "Yes" : "No"}
    </div>
  );
}

function DrawToCanvas({ children, colorSpace }) {
  const [contentDiv, setContentDiv] = useState(null);
  const [canvas, setCanvas] = useState(null);

  const size = 200;
  const scale = window.devicePixelRatio;

  useEffect(() => {
    if (!canvas || !contentDiv) {
      return;
    }
    const ctx = canvas.getContext("2d", { colorSpace });
    ctx.scale(scale, scale);
    if (!ctx) {
      return;
    }
    const svg = contentDiv.innerHTML;
    const img = new Image();
    img.src = "data:image/svg+xml," + encodeURIComponent(svg);
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
    };
  }, [canvas, colorSpace, contentDiv, scale]);

  return (
    <div>
      <div style={{ display: "none" }} ref={setContentDiv}>
        {children}
      </div>
      <canvas
        ref={setCanvas}
        width={Math.floor(size * scale)}
        height={Math.floor(size * scale)}
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  );
}

function ToggleDiv({ children }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <div style={{ fontStyle: "italic" }}>
        Displaying the HDR pixel affects all SVGs on the page.
      </div>
      <button onClick={() => setVisible((v) => !v)}>
        {visible ? "Hide SVG" : "Show SVG"}
      </button>
      <div>{visible && children}</div>
    </div>
  );
}

function DetectP3Screen() {
  const [isP3, setIsP3] = useState(null);

  useEffect(() => {
    if (CSS.supports("color", "color(display-p3 1 1 1)")) {
      let media = window.matchMedia("(color-gamut:p3)");
      setIsP3(media.matches);
      const fn = () => {
        setIsP3(media.matches);
      };
      media.addEventListener("change", fn);
      return () => media.removeEventListener("change", fn);
    }
  }, []);

  return (
    <div
      style={{
        margin: "10px 0",
        padding: 16,
        background:
          isP3 === null ? "lightgray" : isP3 ? "lightgreen" : "lightcoral",
      }}
    >
      Does your current screen support Display P3?
      <br />
      {isP3 ? "Yes" : "No"}
    </div>
  );
}
