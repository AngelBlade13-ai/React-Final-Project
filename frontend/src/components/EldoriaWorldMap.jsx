import { useMemo, useRef, useState } from "react";

const VIEW_BOX = { width: 1000, height: 700 };
const CHRONICLE_ARC =
  "M188 520 C258 344, 388 184, 500 130 C636 118, 736 174, 812 286 C748 420, 674 502, 580 540";

const LAND_PATH = `
M 146 198
C 146 160, 154 132, 172 110
C 206 92, 246 80, 292 72
C 328 66, 366 62, 408 60
C 438 60, 466 64, 490 68
C 512 64, 530 70, 546 76
C 570 72, 602 66, 640 66
C 676 68, 706 74, 734 78
C 770 84, 804 94, 842 110
C 868 120, 894 134, 922 144
C 954 160, 978 184, 998 210
C 1012 230, 1024 254, 1032 282
C 1042 314, 1048 342, 1050 370
C 1050 396, 1046 420, 1036 442
C 1024 468, 1008 494, 988 514
C 966 534, 948 556, 914 592
C 890 614, 874 628, 854 642
C 834 656, 818 678, 784 704
C 758 724, 734 738, 708 748
C 678 760, 644 768, 576 770
C 540 770, 504 772, 468 764
C 436 756, 394 748, 344 732
C 310 722, 272 710, 234 686
C 202 668, 178 654, 154 634
C 140 620, 106 576, 84 532
C 62 500, 52 466, 48 432
C 6 436, -36 440, -84 446
C -84 352, -84 256, -84 166
Z
`;

const COAST_PATH = `
M 146 198
C 146 160, 154 132, 172 110
C 206 92, 246 80, 292 72
C 328 66, 366 62, 408 60
C 438 60, 466 64, 490 68
C 512 64, 530 70, 546 76
C 570 72, 602 66, 640 66
C 676 68, 706 74, 734 78
C 770 84, 804 94, 842 110
C 868 120, 894 134, 922 144
C 954 160, 978 184, 998 210
C 1012 230, 1024 254, 1032 282
C 1042 314, 1048 342, 1050 370
C 1050 396, 1046 420, 1036 442
C 1024 468, 1008 494, 988 514
C 966 534, 948 556, 914 592
C 890 614, 874 628, 854 642
C 834 656, 818 678, 784 704
C 758 724, 734 738, 708 748
C 678 760, 644 768, 576 770
C 540 770, 504 772, 468 764
C 436 756, 394 748, 344 732
C 310 722, 272 710, 234 686
C 202 668, 178 654, 154 634
C 140 620, 106 576, 84 532
`;

const COAST_HIGHLIGHT_PATH = `
M 156 184
C 156 150, 164 126, 180 108
C 212 92, 248 82, 290 76
C 324 70, 360 66, 402 64
C 434 64, 462 68, 486 72
C 508 68, 526 74, 542 80
C 566 76, 598 70, 634 70
C 668 72, 698 78, 726 82
C 762 88, 796 98, 836 114
C 866 126, 890 138, 910 146
C 942 162, 966 186, 986 208
C 1000 230, 1012 254, 1020 280
C 1032 310, 1038 338, 1040 366
C 1040 394, 1036 416, 1026 436
C 1014 462, 998 486, 980 506
C 960 526, 936 548, 910 580
C 886 602, 868 618, 850 634
C 830 650, 812 670, 788 692
C 762 712, 738 726, 712 738
C 682 750, 648 758, 582 760
C 532 760, 494 760, 458 750
C 426 742, 394 732, 356 718
C 322 708, 286 696, 250 674
C 218 656, 194 640, 170 620
C 146 600, 116 562, 96 526
`;

const STORY_PATHS = {
  "1-2": "M220 420 C286 314, 386 186, 500 130",
  "2-3": "M500 130 C616 140, 706 188, 780 280",
  "3-4": "M780 280 C716 378, 662 468, 580 540",
  "1-3": "M220 420 C392 392, 596 334, 780 280",
};

const POWER_PATHS = {
  "1-3": "M220 420 C404 372, 592 326, 780 280",
  "3-4": "M780 280 C726 376, 658 462, 580 540",
};

const ECHO_PATH = "M500 130 C560 158, 646 208, 780 280";
const MIN_ZOOM = 1;
const MAX_ZOOM = 2.2;
const ZOOM_STEP = 0.2;
const DRAG_THRESHOLD = 6;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getPanLimits(zoom, width, height) {
  if (zoom <= 1) {
    return { x: 0, y: 0 };
  }

  return {
    x: ((zoom - 1) * width) / 2,
    y: ((zoom - 1) * height) / 2,
  };
}

function clampPan(nextPan, zoom, width, height) {
  const limits = getPanLimits(zoom, width, height);
  return {
    x: clamp(nextPan.x, -limits.x, limits.x),
    y: clamp(nextPan.y, -limits.y, limits.y),
  };
}

function getNodeRadius(node) {
  if (node.chapterNumber === "3") {
    return { glow: 74, ring: 42, core: 16 };
  }

  if (node.chapterNumber === "2") {
    return { glow: 40, ring: 26, core: 12 };
  }

  if (node.chapterNumber === "1") {
    return { glow: 32, ring: 22, core: 11 };
  }

  return { glow: 24, ring: 18, core: 9 };
}

function getPathState(path, activeChapter) {
  if (!activeChapter) {
    return "";
  }

  return path.from === activeChapter || path.to === activeChapter ? "active" : "dimmed";
}

export default function EldoriaWorldMap({ currentSlug, entries, onEnterChronicle }) {
  const [hoveredChapter, setHoveredChapter] = useState("");
  const [focusedChapter, setFocusedChapter] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });
  const suppressClickRef = useRef(false);

  const activeChapter = hoveredChapter || focusedChapter || selectedChapter || "";
  const canPan = zoom > 1.01;

  const activeNode = useMemo(() => {
    if (!activeChapter) {
      return null;
    }

    return (
      entries.find((entry) => entry.chapterNumber === activeChapter) ||
      entries.find((entry) => entry.slug === currentSlug) ||
      null
    );
  }, [activeChapter, currentSlug, entries]);

  const storyPaths = useMemo(() => {
    return Object.entries(STORY_PATHS).map(([key, d]) => {
      const [from, to] = key.split("-");
      return {
        key,
        from,
        to,
        d,
        state: getPathState({ from, to }, activeNode?.chapterNumber || ""),
      };
    });
  }, [activeNode]);

  function handleNodeClick(node) {
    if (!node.slug || suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    setSelectedChapter(node.chapterNumber);
    window.setTimeout(() => {
      onEnterChronicle(node.slug);
    }, 260);
  }

  function handlePointerDown(event) {
    if (event.button !== 0 || !canPan) {
      return;
    }

    setHoveredChapter("");
    setFocusedChapter("");

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    dragStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
      moved: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    const dragState = dragStateRef.current;
    if (!dragState.active || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (!dragState.moved && Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD) {
      dragState.moved = true;
      setIsDragging(true);
      setHoveredChapter("");
      setFocusedChapter("");
    }

    if (!dragState.moved) {
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setPan(
      clampPan(
        {
          x: dragState.originX + deltaX,
          y: dragState.originY + deltaY,
        },
        zoom,
        rect.width,
        rect.height
      )
    );
  }

  function finishDrag(event) {
    const dragState = dragStateRef.current;
    if (!dragState.active || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (dragState.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }

    dragStateRef.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      originX: 0,
      originY: 0,
      moved: false,
    };
    setIsDragging(false);
    setHoveredChapter("");
    setFocusedChapter("");
  }

  function updateZoom(nextZoom) {
    const rect = canvasRef.current?.getBoundingClientRect();
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    setZoom(clampedZoom);

    if (!rect) {
      if (clampedZoom <= 1) {
        setPan({ x: 0, y: 0 });
      }
      return;
    }

    setPan((currentPan) => clampPan(clampedZoom <= 1 ? { x: 0, y: 0 } : currentPan, clampedZoom, rect.width, rect.height));
  }

  function handleWheel(event) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    updateZoom(zoom + direction * ZOOM_STEP);
  }

  function stopControlPointer(event) {
    event.stopPropagation();
  }

  function stopControlClick(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleZoomInClick(event) {
    stopControlClick(event);
    handleZoomIn();
  }

  function handleZoomOutClick(event) {
    stopControlClick(event);
    handleZoomOut();
  }

  function handleResetViewClick(event) {
    stopControlClick(event);
    handleResetView();
  }

  function handleZoomIn() {
    updateZoom(zoom + ZOOM_STEP);
  }

  function handleZoomOut() {
    updateZoom(zoom - ZOOM_STEP);
  }

  function handleResetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
  }

  return (
    <section className="intro-card homepage-panel eldoria-map-panel eldoria-svg-map-panel">
      <div className="section-head eldoria-chronicle-head eldoria-map-head">
        <h2>The Realm Of Eldoria</h2>
        <span>Geography and chronology now share the same surface.</span>
      </div>

      <div
        className={`eldoria-map-canvas eldoria-svg-map-canvas${selectedChapter ? " transitioning" : ""}${isDragging ? " dragging" : ""}${canPan ? " zoomed" : ""}`}
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onWheelCapture={handleWheel}
      >
        <div className="eldoria-map-controls">
          <button
            className="eldoria-map-control"
            onClick={handleZoomInClick}
            onPointerDown={stopControlPointer}
            type="button"
          >
            +
          </button>
          <button
            className="eldoria-map-control"
            onClick={handleZoomOutClick}
            onPointerDown={stopControlPointer}
            type="button"
          >
            -
          </button>
          <button
            className="eldoria-map-control eldoria-map-control-reset"
            onClick={handleResetViewClick}
            onPointerDown={stopControlPointer}
            type="button"
          >
            Reset
          </button>
        </div>

        <div className="eldoria-map-atmosphere">
          <div className="eldoria-map-fog" />
          <div className="eldoria-map-particles" />
          <div className="eldoria-map-mist eldoria-map-mist-left" />
          <div className="eldoria-map-mist eldoria-map-mist-right" />
        </div>

        <div
          className="eldoria-map-viewport"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <svg
            aria-label="Eldoria Chronicle Map"
            className="eldoria-map-svg"
            preserveAspectRatio="xMidYMid meet"
            viewBox={`0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`}
          >
          <defs>
            <linearGradient id="eldoria-ocean-gradient" x1="18%" x2="88%" y1="14%" y2="100%">
              <stop offset="0%" stopColor="#d3e1df" />
              <stop offset="26%" stopColor="#b7cdd1" />
              <stop offset="58%" stopColor="#87a7b4" />
              <stop offset="100%" stopColor="#506b7e" />
            </linearGradient>

            <radialGradient id="eldoria-ocean-depth" cx="50%" cy="46%" r="84%">
              <stop offset="42%" stopColor="#f4faf6" stopOpacity="0.12" />
              <stop offset="62%" stopColor="#7ba1ae" stopOpacity="0.1" />
              <stop offset="84%" stopColor="#27475c" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#172c3d" stopOpacity="0.5" />
            </radialGradient>

            <radialGradient id="eldoria-ocean-vignette" cx="50%" cy="48%" r="78%">
              <stop offset="56%" stopColor="#0b1721" stopOpacity="0" />
              <stop offset="84%" stopColor="#10202d" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#08121a" stopOpacity="0.24" />
            </radialGradient>

            <radialGradient
              id="eldoria-land-gradient"
              cx="710"
              cy="294"
              fx="710"
              fy="294"
              gradientUnits="userSpaceOnUse"
              r="760"
            >
              <stop offset="0%" stopColor="#e4de9f" />
              <stop offset="16%" stopColor="#d6d887" />
              <stop offset="34%" stopColor="#9db46d" />
              <stop offset="56%" stopColor="#738d58" />
              <stop offset="80%" stopColor="#64745a" />
              <stop offset="100%" stopColor="#535e54" />
            </radialGradient>

            <filter id="eldoria-paper-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="8" result="noise" />
              <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
              <feComponentTransfer in="monoNoise" result="grain">
                <feFuncA type="table" tableValues="0 0.04" />
              </feComponentTransfer>
            </filter>

            <filter id="eldoria-land-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="14" result="noise" />
              <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
              <feComponentTransfer in="monoNoise" result="grain">
                <feFuncA type="table" tableValues="0 0.03" />
              </feComponentTransfer>
            </filter>

            <radialGradient cx="50%" cy="50%" id="eldoria-node-glow" r="50%">
              <stop offset="0%" stopColor="#f5e6b8" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#f5e6b8" stopOpacity="0" />
            </radialGradient>

            <radialGradient cx="50%" cy="50%" id="eldoria-fracture-glow" r="50%">
              <stop offset="0%" stopColor="#b8d59c" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#b8d59c" stopOpacity="0" />
            </radialGradient>

            <radialGradient cx="50%" cy="50%" id="eldoria-echo-glow" r="50%">
              <stop offset="0%" stopColor="#cbc7ff" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#cbc7ff" stopOpacity="0" />
            </radialGradient>

            <radialGradient cx="50%" cy="50%" id="eldoria-war-glow" r="50%">
              <stop offset="0%" stopColor="#f0b177" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#f0b177" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="eldoria-story-path" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#d6c7a1" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#e7d9b2" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#d6c7a1" stopOpacity="0.2" />
            </linearGradient>

            <filter id="eldoria-soft-blur">
              <feGaussianBlur stdDeviation="18" />
            </filter>
          </defs>

          <g className="eldoria-map-sea">
            <rect className="eldoria-map-ocean" height={VIEW_BOX.height} rx="28" width={VIEW_BOX.width} x="0" y="0" />
            <rect
              className="eldoria-map-ocean-depth"
              height={VIEW_BOX.height}
              rx="28"
              width={VIEW_BOX.width}
              x="0"
              y="0"
            />

            <path className="eldoria-map-current" d="M28 120 C150 84, 270 94, 366 146" />
            <path className="eldoria-map-current" d="M744 102 C850 98, 926 130, 980 210" />
            <path className="eldoria-map-current" d="M36 584 C170 536, 286 548, 382 620" />
            <path className="eldoria-map-current subtle" d="M760 538 C866 498, 944 510, 992 592" />

            <path className="eldoria-map-coastal-glow" d={COAST_PATH} />
            <path className="eldoria-map-coast-wave" d="M674 90 C786 108, 864 144, 914 206" />
            <path className="eldoria-map-coast-wave" d="M804 442 C856 474, 890 512, 910 566" />
            <path className="eldoria-map-coast-wave subtle" d="M110 564 C226 600, 360 610, 516 592" />
            <path className="eldoria-map-coast-wave" d="M642 116 C756 130, 836 164, 892 224" />
            <path className="eldoria-map-coast-wave" d="M770 470 C824 500, 860 540, 882 594" />
            <path className="eldoria-map-coast-wave subtle" d="M136 534 C248 566, 374 576, 516 562" />
            <path className="eldoria-map-coast-wave subtle" d="M130 148 C262 110, 434 98, 612 118 C748 134, 842 168, 906 244" />
            <path className="eldoria-map-coast-wave subtle" d="M730 612 C798 574, 854 560, 920 570" />
            <path className="eldoria-map-coast-wave subtle" d="M62 188 C146 156, 236 144, 344 160" />
            <path className="eldoria-map-coast-wave subtle" d="M856 430 C916 462, 954 512, 972 574" />
          </g>

          <g className="eldoria-map-landmass">
            <path className="eldoria-map-peninsula-shadow" d={LAND_PATH} transform="translate(10 12)" />
            <path className="eldoria-map-peninsula" d={LAND_PATH} />
            <path className="eldoria-map-land-grain" d={LAND_PATH} />
            <path className="eldoria-map-coastline" d={COAST_PATH} />
            <path className="eldoria-map-coastline-highlight" d={COAST_HIGHLIGHT_PATH} />
          </g>

          <g className="eldoria-map-atmosphere-layer">
            <ellipse className="eldoria-map-capital-bloom" cx="792" cy="278" rx="184" ry="160" />
            <ellipse className="eldoria-map-capital-aura" cx="764" cy="300" rx="242" ry="184" />
            <ellipse className="eldoria-map-echo-mist" cx="498" cy="136" rx="150" ry="98" />
            <ellipse className="eldoria-map-echo-grove-biome" cx="456" cy="164" rx="178" ry="124" />
            <ellipse className="eldoria-map-capital-biome" cx="730" cy="294" rx="246" ry="184" />
            <ellipse className="eldoria-map-warfront-gloom" cx="632" cy="552" rx="166" ry="124" />
          </g>

          <g className="eldoria-map-artifact-layer">
            <rect className="eldoria-map-paper-grain" height={VIEW_BOX.height} rx="28" width={VIEW_BOX.width} x="0" y="0" />
            <rect className="eldoria-map-vignette" height={VIEW_BOX.height} rx="28" width={VIEW_BOX.width} x="0" y="0" />
          </g>

          <g className="eldoria-map-terrain">
            <path className="eldoria-map-contour" d="M198 132 C320 112, 446 110, 590 118 C704 124, 790 146, 850 192" />
            <path className="eldoria-map-contour" d="M184 286 C300 252, 410 242, 558 254 C682 264, 782 256, 860 226" />
            <path className="eldoria-map-contour" d="M186 574 C304 546, 424 546, 556 580 C644 602, 718 600, 786 570" />
            <path className="eldoria-map-contour subtle" d="M238 206 C350 194, 470 202, 612 226 C708 242, 788 240, 846 220" />
            <path className="eldoria-map-contour subtle" d="M242 454 C332 432, 432 428, 546 444 C642 458, 722 458, 784 438" />
            <path className="eldoria-map-river" d="M338 166 C372 226, 378 298, 364 372 C352 434, 362 494, 412 574" />
            <path className="eldoria-map-river branch" d="M364 374 C430 348, 494 304, 580 236" />
            <path className="eldoria-map-road" d="M232 420 C332 344, 456 224, 500 130" />
            <path className="eldoria-map-road secondary" d="M500 130 C612 156, 700 206, 780 280" />
            <path className="eldoria-map-road secondary" d="M780 280 C720 376, 648 468, 590 538" />
          </g>

          <g className="eldoria-map-chronicle-arc-layer">
            <path className="eldoria-map-chronicle-arc" d={CHRONICLE_ARC} />
            {entries.map((node) => (
              <g
                className={`eldoria-map-chronicle-tick${activeNode?.chapterNumber === node.chapterNumber ? " active" : ""}`}
                key={`tick-${node.chapterNumber}`}
              >
                <circle className="eldoria-map-chronicle-dot" cx={node.svgX} cy={node.svgY} r="3.6" />
                <text className="eldoria-map-chronicle-label" x={node.svgX} y={node.svgY - 22}>
                  {node.meta?.chapterNumeral || node.chapterLabel.replace("Chapter ", "")}
                </text>
              </g>
            ))}
          </g>

          <g className="eldoria-map-regions">
            <path
              className="eldoria-map-region-shape eldoria-map-region-echo-grove"
              d="M420 100 C454 68, 520 62, 572 94 C596 124, 586 170, 540 192 C488 206, 438 182, 420 100 Z"
            />
            <path
              className="eldoria-map-region-shape eldoria-map-region-capital"
              d="M688 206 C730 174, 802 172, 850 212 C878 252, 868 308, 812 338 C744 352, 696 318, 688 206 Z"
            />
            <path
              className="eldoria-map-region-shape eldoria-map-region-warfront"
              d="M506 486 C544 454, 614 454, 664 496 C684 540, 668 596, 618 624 C560 634, 520 594, 506 486 Z"
            />

            <g className="eldoria-map-landmarks">
              <path
                className="eldoria-map-landmark eldoria-map-landmark-grove"
                d="M500 94 C490 106, 486 118, 486 132 M500 94 C510 106, 514 118, 514 132 M500 98 L500 142"
              />
              <path
                className="eldoria-map-landmark eldoria-map-landmark-capital"
                d="M764 254 L764 222 L780 208 L796 222 L796 254 M772 254 L772 236 L788 236 L788 254"
              />
              <path
                className="eldoria-map-landmark eldoria-map-landmark-warfront"
                d="M562 562 C576 528, 590 512, 604 492 M594 500 C624 516, 642 538, 650 564"
              />
            </g>

            <g className="eldoria-map-place-labels">
              <text x="122" y="564">Threshold Field</text>
              <text x="362" y="86">Aeloria Echo Grove</text>
              <text x="834" y="210">Eldoria Capital</text>
              <text x="646" y="654">Eastern Warfront</text>
            </g>
          </g>

          <g className="eldoria-map-story-paths">
            {storyPaths.map((path) => (
              <path
                className={`eldoria-map-story-path${path.state ? ` ${path.state}` : ""}${path.key === "1-3" ? " secondary" : ""}`}
                d={path.d}
                key={path.key}
              />
            ))}

            {Object.entries(POWER_PATHS).map(([key, d]) => (
              <path className="eldoria-map-power-path" d={d} key={`power-${key}`} />
            ))}

            <path className="eldoria-map-echo-path" d={ECHO_PATH} />
          </g>

          <g className="eldoria-map-node-layer">
            {entries.map((node) => {
              const radii = getNodeRadius(node);
              const isCurrent = node.slug === currentSlug;
              const isFocused = activeNode?.chapterNumber === node.chapterNumber;
              const scale = isCurrent && isFocused ? 1.12 : isCurrent ? 1.07 : isFocused ? 1.04 : 1;

              return (
                <g
                  className={`eldoria-map-svg-node eldoria-map-svg-node-${node.region} eldoria-map-svg-node-${node.status}${
                    isCurrent ? " current" : ""
                  }${isFocused ? " focused" : ""}`}
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  onFocus={() => {
                    if (dragStateRef.current.active || isDragging) {
                      return;
                    }
                    setFocusedChapter(node.chapterNumber);
                  }}
                  onBlur={() => setFocusedChapter("")}
                  onMouseEnter={() => {
                    if (dragStateRef.current.active || isDragging) {
                      return;
                    }
                    setHoveredChapter(node.chapterNumber);
                  }}
                  onMouseLeave={() => setHoveredChapter("")}
                  tabIndex={node.slug ? 0 : -1}
                  transform={`translate(${node.svgX} ${node.svgY}) scale(${scale})`}
                >
                  <circle
                    className="eldoria-map-svg-node-glow"
                    fill={
                      node.chapterNumber === "1"
                        ? "url(#eldoria-fracture-glow)"
                        : node.chapterNumber === "2"
                          ? "url(#eldoria-echo-glow)"
                          : node.chapterNumber === "4"
                            ? "url(#eldoria-war-glow)"
                            : "url(#eldoria-node-glow)"
                    }
                    r={radii.glow}
                  />

                  {node.chapterNumber === "1" ? <circle className="eldoria-map-node-fracture-ring" cx="0" cy="0" r="30" /> : null}

                  {node.chapterNumber === "2" ? (
                    <>
                      <circle className="eldoria-map-node-echo-ring" cx="0" cy="0" r="27" />
                      <ellipse className="eldoria-map-node-echo-ring subtle" cx="1" cy="-1" rx="35" ry="37" />
                      <ellipse className="eldoria-map-node-echo-ring subtle" cx="-1" cy="1" rx="43" ry="45" />
                    </>
                  ) : null}

                  {node.chapterNumber === "3" ? (
                    <>
                      <path
                        className="eldoria-map-node-capital-rays"
                        d="M0 -70 L0 -40 M48 -50 L28 -30 M70 0 L42 0 M48 48 L30 30 M0 70 L0 42 M-48 48 L-30 30 M-70 0 L-42 0 M-48 -50 L-30 -30"
                      />
                      <path
                        className="eldoria-map-node-capital-sigil"
                        d="M0 -28 L22 -12 L22 16 L0 30 L-22 16 L-22 -12 Z M0 -16 L11 -8 L11 8 L0 17 L-11 8 L-11 -8 Z"
                      />
                    </>
                  ) : null}

                  {node.chapterNumber === "4" ? (
                    <>
                      <path className="eldoria-map-node-war-arc" d="M-30 10 C-26 -22, 2 -34, 30 -24" />
                      <path className="eldoria-map-node-war-arc broken" d="M22 -12 C38 0, 42 20, 34 38" />
                    </>
                  ) : null}

                  <circle className="eldoria-map-svg-node-ring" fill="none" r={radii.ring} />
                  <circle className="eldoria-map-svg-node-core" r={radii.core} />

                  {node.chapterNumber === "1" ? (
                    <path className="eldoria-map-node-motif eldoria-map-node-motif-fracture" d="M-9 -18 L-3 -5 L-8 2 L3 13 L9 20" />
                  ) : null}

                  {node.chapterNumber === "2" ? (
                    <path className="eldoria-map-node-motif eldoria-map-node-motif-echo" d="M-18 -4 C-10 -18, 10 -18, 18 -4 M-14 2 C-8 -8, 8 -8, 14 2" />
                  ) : null}

                  {node.chapterNumber === "3" ? (
                    <path className="eldoria-map-node-motif eldoria-map-node-motif-capital" d="M-10 8 L-10 -4 L0 -13 L10 -4 L10 8 M-6 8 L-6 0 L6 0 L6 8" />
                  ) : null}

                  {node.chapterNumber === "4" ? (
                    <path className="eldoria-map-node-motif eldoria-map-node-motif-warfront" d="M-13 12 C-7 -4, -2 -10, 3 -18 M1 -16 C10 -6, 13 2, 14 12" />
                  ) : null}

                  <text className="eldoria-map-svg-node-roman" x="0" y="-34">
                    {node.meta?.chapterNumeral || node.chapterLabel.replace("Chapter ", "")}
                  </text>
                </g>
              );
            })}
          </g>
          </svg>

          {activeNode ? (
            <div
              className={`eldoria-map-tooltip eldoria-map-tooltip-${activeNode.region} eldoria-map-tooltip-${activeNode.status}`}
              style={{
                left: `${activeNode.x}%`,
                top: `${activeNode.y}%`,
              }}
            >
              <p className="eyebrow">{activeNode.chapterLabel}</p>
              <strong>{activeNode.title}</strong>
              <p className="eldoria-map-tooltip-subtitle">{activeNode.subtitle}</p>
              <p className="eldoria-map-tooltip-state">{activeNode.mapTitle}</p>
              <p className="eldoria-map-tooltip-emotion">{activeNode.emotionalState}</p>
              <p className="eldoria-map-tooltip-action">{activeNode.slug ? "Enter Chronicle" : "Sealed"}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
