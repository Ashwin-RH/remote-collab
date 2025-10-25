import React, { useRef, useState, useEffect } from "react";
import {
  Stage,
  Layer,
  Line,
  Rect,
  Circle,
  Text,
  Arrow,
  Group,
  Transformer,
} from "react-konva";

import {
  Pencil,
  Highlighter,
  Square,
  Circle as CircleIcon,
  ArrowRight,
  Type,
  StickyNote,
  Trash2,
  Download,
  Undo,
  Redo,
  Eraser,
  LineSquiggle,
  PaintBucket,
} from "lucide-react";

import { io } from "socket.io-client";
import { nanoid } from "nanoid";

const socket = io("http://localhost:4000");

const TOOLS = {
  PEN: "pen",
  HIGHLIGHTER: "highlighter",
  ERASER: "eraser",
  RECTANGLE: "rectangle",
  CIRCLE: "circle",
  ARROW: "arrow",
  TEXT: "text",
  STICKY: "sticky",
};

const Whiteboard = ({ workspaceId, user, socket }) => {
  const [tool, setTool] = useState(TOOLS.PEN);
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [lines, setLines] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [texts, setTexts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  const [history, setHistory] = useState([]);
const [redoStack, setRedoStack] = useState([]);

const [cursors, setCursors] = useState({}); // { userId: { x, y, name } }
const [activeUsers, setActiveUsers] = useState({}); // { userId: { name, lastActiveAt } }

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });


  const isDrawing = useRef(false);
  const stageRef = useRef();
  const trRef = useRef();

  // --- Join workspace room ---
  useEffect(() => {
    if (workspaceId) {
      socket.emit("whiteboard:join", { workspaceId });
    }
  }, [workspaceId]);

  // --- Socket listeners ---
  useEffect(() => {
    const initListener = (data) => {
      if (data.workspaceId !== workspaceId) return;
      setLines(data.lines || []);
      setShapes(data.shapes || []);
      setTexts(data.texts || []);
    };

    const lineListener = ({ workspaceId: wid, line }) => {
      if (wid !== workspaceId) return;
      setLines((prev) => [...prev, line]);
    };

    const shapeListener = ({ workspaceId: wid, shape }) => {
      if (wid !== workspaceId) return;
      setShapes((prev) => [...prev, shape]);
    };

    const textListener = ({ workspaceId: wid, text }) => {
      if (wid !== workspaceId) return;
      setTexts((prev) => [...prev, text]);
    };

    const transformListener = ({ workspaceId: wid, updated }) => {
      if (wid !== workspaceId) return;
      if (updated.type === "shape") {
        setShapes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else if (updated.type === "text") {
        setTexts((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    };

    const cursorsListener = ({ workspaceId: wid, cursors: incoming }) => {
  if (wid !== workspaceId) return;
  setCursors((prev) => {
    const copy = { ...prev };
    for (const [uid, data] of Object.entries(incoming || {})) {
      if (data === null) {
        // server uses null to indicate removal
        delete copy[uid];
      } else {
        copy[uid] = data;
      }
    }
    return copy;
  });
};

    const clearListener = ({ workspaceId: wid }) => {
      if (wid !== workspaceId) return;
      setLines([]);
      setShapes([]);
      setTexts([]);
    };

    const activityListener = ({ workspaceId: wid, activeUsers: incoming }) => {
  if (wid !== workspaceId) return;
  // server sends an object mapping userId -> { name, lastActiveAt }
  setActiveUsers(incoming || {});
};

const eraseListener = ({ workspaceId: wid, x, y }) => {
  if (wid !== workspaceId) return;
  const eraseRadius = 10;

  setLines((prev) =>
    prev.filter((line) => {
      for (let i = 0; i < line.points.length; i += 2) {
        const dx = line.points[i] - x;
        const dy = line.points[i + 1] - y;
        if (Math.sqrt(dx * dx + dy * dy) < eraseRadius) return false;
      }
      return true;
    })
  );

  setShapes((prev) =>
    prev.filter((shape) => {
      const dx = shape.x - x;
      const dy = shape.y - y;
      return Math.sqrt(dx * dx + dy * dy) > eraseRadius;
    })
  );

  setTexts((prev) =>
    prev.filter((t) => {
      const dx = t.x - x;
      const dy = t.y - y;
      return Math.sqrt(dx * dx + dy * dy) > eraseRadius;
    })
  );
};

    socket.on("whiteboard:init", initListener);
    socket.on("whiteboard:line", lineListener);
    socket.on("whiteboard:shape", shapeListener);
    socket.on("whiteboard:text", textListener);
    socket.on("whiteboard:transform", transformListener);
    socket.on("whiteboard:clear", clearListener);
    socket.on("whiteboard:cursors", cursorsListener);
    socket.on("whiteboard:activity", activityListener);
    socket.on("whiteboard:erase", eraseListener);


    return () => {
      socket.off("whiteboard:init", initListener);
      socket.off("whiteboard:line", lineListener);
      socket.off("whiteboard:shape", shapeListener);
      socket.off("whiteboard:text", textListener);
      socket.off("whiteboard:transform", transformListener);
      socket.off("whiteboard:clear", clearListener);
      socket.off("whiteboard:cursors", cursorsListener);
      socket.off("whiteboard:activity", activityListener);
      socket.off("whiteboard:erase", eraseListener);


    };
  }, [workspaceId]);

  // --- Mouse Handlers ---
  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    const clickedOnEmpty = e.target === stage;
    if (clickedOnEmpty) setSelectedId(null);

    if (!clickedOnEmpty) return;

    const pos = stage.getPointerPosition();
    if (tool === TOOLS.ERASER) {
  const stage = e.target.getStage();
  const pos = stage.getPointerPosition();
  const eraseRadius = 10; // adjust to erase faster or slower

  setLines((prev) =>
    prev.filter((line) => {
      const pts = line.points;
      for (let i = 0; i < pts.length; i += 2) {
        const dx = pts[i] - pos.x;
        const dy = pts[i + 1] - pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < eraseRadius) {
          return false; // erase line
        }
      }
      return true;
    })
  );

  setShapes((prev) =>
    prev.filter((shape) => {
      const dx = shape.x - pos.x;
      const dy = shape.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist > eraseRadius;
    })
  );

  setTexts((prev) =>
    prev.filter((t) => {
      const dx = t.x - pos.x;
      const dy = t.y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) > eraseRadius;
    })
  );

  socket.emit("whiteboard:erase", { workspaceId, x: pos.x, y: pos.y });
  return; // stop other draw logic
}

    isDrawing.current = true;
    // announce active (start)
if (workspaceId) socket.emit("whiteboard:active", { workspaceId, active: true });


    if (tool === TOOLS.PEN || tool === TOOLS.HIGHLIGHTER) {
      const newLine = { id: nanoid(), points: [pos.x, pos.y], tool, color, strokeWidth };
      setLines((prev) => [...prev, newLine]);
      socket.emit("whiteboard:line", { workspaceId, line: newLine });
    } else if ([TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.ARROW].includes(tool)) {
      const newShape = { id: nanoid(), x: pos.x, y: pos.y, width: 0, height: 0, tool, color, strokeWidth };
      setShapes((prev) => [...prev, newShape]);
      socket.emit("whiteboard:shape", { workspaceId, shape: newShape });
    } else if (tool === TOOLS.TEXT || tool === TOOLS.STICKY) {
      const id = nanoid();
      const newText = {
        id,
        x: pos.x,
        y: pos.y,
        text: tool === TOOLS.TEXT ? "Text" : "Sticky Note",
        tool,
        color,
        fontSize: tool === TOOLS.TEXT ? 18 : 14,
      };
      setTexts((prev) => [...prev, newText]);
      socket.emit("whiteboard:text", { workspaceId, text: newText });
      setEditingTextId(id);
      setEditingTextValue(newText.text);
    }
  };

  const handleMouseMove = (e) => {
  const stage = e.target.getStage();
  const pos = stage.getPointerPosition();
  if (!pos) return;

  // update pointer state
  setPointerPos({ x: pos.x, y: pos.y });

  // Clamp position within stage width & height
  const x = clamp(pos.x, 0, stage.width());
  const y = clamp(pos.y, 0, stage.height());

  socket.emit("whiteboard:cursor", { workspaceId, user, x, y });

  if (tool === TOOLS.ERASER) {
  const stage = e.target.getStage();
  const pos = stage.getPointerPosition();
  const eraseRadius = 10; // adjust as needed

  setLines((prev) =>
    prev.filter((line) => {
      const pts = line.points;
      for (let i = 0; i < pts.length; i += 2) {
        const dx = pts[i] - pos.x;
        const dy = pts[i + 1] - pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < eraseRadius) {
          return false; // erase line if near cursor
        }
      }
      return true;
    })
  );

  setShapes((prev) =>
    prev.filter((shape) => {
      const dx = shape.x - pos.x;
      const dy = shape.y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) > eraseRadius;
    })
  );

  setTexts((prev) =>
    prev.filter((t) => {
      const dx = t.x - pos.x;
      const dy = t.y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) > eraseRadius;
    })
  );

  socket.emit("whiteboard:erase", { workspaceId, x: pos.x, y: pos.y });
  return; // stop other draw logic
}


  if (!isDrawing.current) return;

  if (tool === TOOLS.PEN || tool === TOOLS.HIGHLIGHTER) {
    setLines((prev) => {
      const lastLine = { ...prev[prev.length - 1] };
      lastLine.points = lastLine.points.concat([x, y]);
      socket.emit("whiteboard:line", { workspaceId, line: lastLine });
      return [...prev.slice(0, -1), lastLine];
    });
  } else if ([TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.ARROW].includes(tool)) {
    setShapes((prev) => {
      const lastShape = { ...prev[prev.length - 1] };
      lastShape.width = x - lastShape.x;
      lastShape.height = y - lastShape.y;
      socket.emit("whiteboard:transform", { workspaceId, updated: { ...lastShape, type: "shape" } });
      return [...prev.slice(0, -1), lastShape];
    });
  }
};


const handleUndo = () => {
  if (lines.length === 0 && shapes.length === 0 && texts.length === 0) return;

  const prevState = { lines, shapes, texts };
  setHistory((prev) => [...prev, prevState]);

  if (lines.length > 0) {
    const newLines = lines.slice(0, -1);
    setRedoStack((prev) => [...prev, { type: "line", data: lines[lines.length - 1] }]);
    setLines(newLines);
  } else if (shapes.length > 0) {
    const newShapes = shapes.slice(0, -1);
    setRedoStack((prev) => [...prev, { type: "shape", data: shapes[shapes.length - 1] }]);
    setShapes(newShapes);
  } else if (texts.length > 0) {
    const newTexts = texts.slice(0, -1);
    setRedoStack((prev) => [...prev, { type: "text", data: texts[texts.length - 1] }]);
    setTexts(newTexts);
  }
};

const handleRedo = () => {
  if (redoStack.length === 0) return;
  const lastRedo = redoStack[redoStack.length - 1];
  setRedoStack((prev) => prev.slice(0, -1));

  if (lastRedo.type === "line") setLines((prev) => [...prev, lastRedo.data]);
  else if (lastRedo.type === "shape") setShapes((prev) => [...prev, lastRedo.data]);
  else if (lastRedo.type === "text") setTexts((prev) => [...prev, lastRedo.data]);
};



  const handleMouseUp = () => {
    isDrawing.current = false;
    // announce inactive (stop)
if (workspaceId) socket.emit("whiteboard:active", { workspaceId, active: false });
  };

  useEffect(() => {
  const onBeforeUnload = () => {
    if (workspaceId) socket.emit("whiteboard:active", { workspaceId, active: false });
  };
  window.addEventListener("beforeunload", onBeforeUnload);
  return () => window.removeEventListener("beforeunload", onBeforeUnload);
}, [workspaceId]);

  // --- Selection & Transformer ---
  useEffect(() => {
    if (trRef.current) {
      if (selectedId) {
        const node = stageRef.current.findOne(`#${selectedId}`);
        if (node) trRef.current.nodes([node]);
        trRef.current.getLayer().batchDraw();
      } else {
        trRef.current.nodes([]);
      }
    }
  }, [selectedId, shapes, texts]);

  const handleSelect = (id) => setSelectedId(id);

  const handleTransform = (node, type) => {
  const id = node.id();
  if (!id) return;

  const stage = stageRef.current;
  const width = stage.width();
  const height = stage.height();

  // Clamp coordinates
  const x = clamp(node.x(), 0, width - 10);
  const y = clamp(node.y(), 0, height - 10);
  node.x(x);
  node.y(y);

  const updated = {
    id,
    x,
    y,
    width: node.width() * node.scaleX(),
    height: node.height() * node.scaleY(),
    rotation: node.rotation(),
    tool: type === "shape" ? shapes.find((s) => s.id === id)?.tool : texts.find((t) => t.id === id)?.tool,
    color: type === "shape" ? shapes.find((s) => s.id === id)?.color : texts.find((t) => t.id === id)?.color,
    text: type === "text" ? node.text() : undefined,
    type,
  };

  if (type === "shape") setShapes((prev) => prev.map((s) => (s.id === id ? updated : s)));
  else if (type === "text") setTexts((prev) => prev.map((t) => (t.id === id ? updated : t)));

  socket.emit("whiteboard:transform", { workspaceId, updated });
};


  // --- Text Editing ---
  const handleTextDoubleClick = (text) => {
    setEditingTextId(text.id);
    setEditingTextValue(text.text);
  };
  const handleTextChange = (e) => setEditingTextValue(e.target.value);
  const handleTextSubmit = () => {
    if (!editingTextId) return;
    setTexts((prev) =>
      prev.map((t) =>
        t.id === editingTextId ? { ...t, text: editingTextValue } : t
      )
    );
    socket.emit("whiteboard:transform", {
      workspaceId,
      updated: { id: editingTextId, text: editingTextValue, type: "text" },
    });
    setEditingTextId(null);
    setEditingTextValue("");
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleTextSubmit();
  };

  // --- Clear & Export ---
  const handleClear = () => {
    setLines([]);
    setShapes([]);
    setTexts([]);
    socket.emit("whiteboard:clear", { workspaceId });
  };

  const handleExport = () => {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL();
    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = uri;
    link.click();
  };

  return (
    <div className="p-4 bg-gray-900 border border-gray-600 rounded-xl relative">
      <div className="flex items-center justify-between mb-2">
  <h2 className="text-xl font-bold">Workspace Whiteboard</h2>
  <div
    className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg shadow-inner transition-all duration-200 ${
      activeUsers && Object.keys(activeUsers).length > 0
        ? "bg-green-500/10 text-green-400 border border-green-600/40 shadow-green-500/10"
        : "bg-gray-700/40 text-gray-400 border border-gray-600/40 shadow-blue-500/10"
    }`}
  >
    <Pencil
      className={`w-4 h-4 ${
        activeUsers && Object.keys(activeUsers).length > 0
          ? "text-green-400"
          : "text-gray-400"
      }`}
    />
    {activeUsers && Object.keys(activeUsers).length > 0 ? (
      <span>
        Active:{" "}
        {Object.values(activeUsers)
          .map((u) => u.name)
          .join(", ")}
      </span>
    ) : (
      "No one is currently editing"
    )}
  </div>
</div>


      <div className="mt-4 mb-4 mx-2 flex flex-wrap items-center justify-start gap-2">
        <div className="flex gap-1.5 items-center border border-gray-500/50 hover:shadow-2xl hover:shadow-blue-500/30 z-10 bg-gray-800/70 p-1.5 rounded-md duration-1500 transition-all">
  <button
    onClick={() => setTool(TOOLS.PEN)}
    className={`p-2 hover:text-gray-300 rounded border border-gray-500/50 hover:rounded-xl bg-gray-300  hover:bg-transparent hover:scale-105 transition-all duration-300 cursor-pointer ${
      tool === TOOLS.PEN ? "text-gray-800 rounded-xl shadow-sm shadow-blue-800/60 border border-gray-600 duration-300 transition-all z-10" : " bg-gray-600/40 text-gray-100"
    }`}
    title="Pen"
  >
    <Pencil size={18} />
  </button>

  <button
    onClick={() => setTool(TOOLS.HIGHLIGHTER)}
    className={`p-2 hover:text-gray-300 rounded border border-gray-500/50 hover:rounded-xl  bg-gray-300  hover:bg-transparent hover:scale-105 transition-all duration-300 cursor-pointer ${
      tool === TOOLS.HIGHLIGHTER ? "text-gray-800 rounded-xl shadow-sm shadow-blue-800/60 border border-gray-600 duration-300 transition-all" : " bg-gray-600/40 text-gray-100"
    }`}
    title="Highlighter"
  >
    <Highlighter size={18} />
  </button>

   <button
  onClick={() => setTool(TOOLS.ERASER)}
  className={`p-2 hover:text-gray-300 rounded border border-gray-500/50 hover:rounded-xl  bg-gray-300  hover:bg-transparent hover:scale-105 transition-all duration-300 cursor-pointer ${
    tool === TOOLS.ERASER ? "text-gray-800 rounded-xl shadow-sm shadow-blue-800/60 border border-gray-600 duration-300 transition-all" : "bg-gray-600/40 text-gray-100"}`}
  title="Eraser"
>
  <Eraser size={18} />
</button>


  <button
    onClick={() => setTool(TOOLS.RECTANGLE)}
    className={`p-2 hover:text-gray-300 rounded border border-gray-500/50 hover:rounded-xl  bg-gray-300  hover:bg-transparent hover:scale-105 transition-all duration-300 cursor-pointer ${
      tool === TOOLS.RECTANGLE ? "text-gray-800 rounded-xl shadow-sm shadow-blue-800/60 border border-gray-600 duration-300 transition-all" : " bg-gray-600/40 text-gray-100"
    }`}
    title="Rectangle"
  >
    <Square size={18} />
  </button>

  <button
    onClick={() => setTool(TOOLS.CIRCLE)}
    className={`p-2 hover:text-gray-300 rounded border border-gray-500/50 hover:rounded-xl  bg-gray-300  hover:bg-transparent hover:scale-105 transition-all duration-300 cursor-pointer ${
      tool === TOOLS.CIRCLE ? "text-gray-800 rounded-xl shadow-sm shadow-blue-800/60 border border-gray-600 duration-300 transition-all" : " bg-gray-600/40 text-gray-100"
    }`}
    title="Circle"
  >
    <CircleIcon size={18} />
  </button>

  <button
    onClick={() => setTool(TOOLS.ARROW)}
    className={`p-2 hover:text-gray-300 rounded border border-gray-500/50 hover:rounded-xl  bg-gray-300  hover:bg-transparent hover:scale-105 transition-all duration-300 cursor-pointer ${
      tool === TOOLS.ARROW ? "text-gray-800 rounded-xl shadow-sm shadow-blue-800/60 border border-gray-600 duration-300 transition-all" : " bg-gray-600/40 text-gray-100"
    }`}
    title="Arrow"
  >
    <ArrowRight size={18} />
  </button>

  <button
    onClick={() => setTool(TOOLS.TEXT)}
    className={`p-2 hover:text-gray-300 rounded border border-gray-500/50 hover:rounded-xl  bg-gray-300  hover:bg-transparent hover:scale-105 transition-all duration-300 cursor-pointer ${
      tool === TOOLS.TEXT ? "text-gray-800 rounded-xl shadow-sm shadow-blue-800/60 border border-gray-600 duration-300 transition-all" : " bg-gray-600/40 text-gray-100"
    }`}
    title="Text"
  >
    <Type size={18} />
  </button>

  <button
    onClick={() => setTool(TOOLS.STICKY)}
    className={`p-2 hover:text-gray-300 rounded border border-gray-500/50 hover:rounded-xl  bg-gray-300  hover:bg-transparent hover:scale-105 transition-all duration-300 cursor-pointer ${
      tool === TOOLS.STICKY ? "text-gray-800 rounded-xl shadow-sm shadow-blue-800/60 border border-gray-600 duration-300 transition-all" : " bg-gray-600/40 text-gray-100"
    }`}
    title="Sticky Note"
  >
    <StickyNote size={18} />
  </button>

   <div className="flex flex-wrap items-center border-l border-gray-500/50 pl-3 gap-2">
    <div className="flex items-center border-r border-gray-500/50 pr-3 gap-1">
      <PaintBucket />
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="w-9 h-9 rounded cursor-pointer shadow-inner hover:scale-105 transition-transform duration-150"
      />
    </div>

    <div className="flex items-center border border-gray-600 rounded p-0.5 mr-1.5 pl-2 gap-2">
      <LineSquiggle />
      <input
        id="strokeWidth"
        type="range"
        min={1}
        max={50}
        value={strokeWidth}
        onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
        className="w-28 accent-blue-500/40 cursor-pointer"
      />
      <span className="text-xs text-gray-400 w-8 text-center font-medium">
        {strokeWidth}
      </span>
    </div>
  </div>

  {/* ↩️ Undo/Redo */}
  <div className="flex gap-1.5 border-l border-gray-500 pl-2.5 flex-wrap">
    <button
      onClick={handleUndo}
      className="p-2 text-emerald-400 border border-gray-600 bg-gray-600/30 hover:bg-transparent rounded hover:rounded-xl cursor-pointer transition-all duration-300"
      title="Undo"
    >
      <Undo size={20} />
    </button>
    <button
      onClick={handleRedo}
      className="p-2 text-amber-400 border border-gray-600 bg-gray-600/30 hover:bg-transparent rounded hover:rounded-xl cursor-pointer transition-all duration-300"
      title="Redo"
    >
      <Redo size={20} />
    </button>
  </div>

  {/* 🗑️ Clear & Export */}
  <div className="flex gap-1.5 border-l border-gray-500 pl-2.5 flex-wrap">
    <button
      onClick={handleClear}
      className="p-2 hover:bg-gray-600/30 bg-gray-600/30 hover:text-white text-red-500 rounded hover:rounded-xl transition-all duration-300 cursor-pointer"
      title="Clear Whiteboard"
    >
      <Trash2 size={20} />
    </button>
    <button
      onClick={handleExport}
      className="p-2 bg-gray-600/30 hover:bg-gray-600/30 hover:text-white text-green-500 rounded hover:rounded-xl transition-all duration-300 cursor-pointer"
      title="Export Whiteboard"
    >
      <Download size={20} />
    </button>
  </div>
</div>
      </div>







      {editingTextId && (
        <input
          type="text"
          value={editingTextValue}
          onChange={handleTextChange}
          onBlur={handleTextSubmit}
          onKeyDown={handleKeyDown}
          className="absolute z-50  p-1 border rounded"
          style={{
            left: texts.find((t) => t.id === editingTextId)?.x || 0,
            top: texts.find((t) => t.id === editingTextId)?.y || 0,
          }}
          autoFocus
        />
      )}

      


      <Stage
        ref={stageRef}
        width={1200}
        height={800}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`border-4 bg-gray-200 border-gray-900 rounded-xl ${
    tool === TOOLS.ERASER ? "cursor-crosshair" : "cursor-default"
  }`}
      >
        <Layer>
          {lines.map((line) => (
            <Line
              key={line.id}
              points={line.points}
              stroke={
                line.tool === TOOLS.HIGHLIGHTER ? line.color + "55" : line.color
              }
              strokeWidth={line.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          ))}

          {shapes.map((shape) => {
            const commonProps = {
              stroke: shape.color,
              strokeWidth: shape.strokeWidth,
              id: shape.id,
              draggable: true,
              onClick: () => handleSelect(shape.id),
              onDragEnd: (e) => handleTransform(e.target, "shape"),
              onTransformEnd: (e) => handleTransform(e.target, "shape"),
            };
            if (shape.tool === TOOLS.RECTANGLE)
              return (
                <Rect
                  key={shape.id}
                  {...commonProps}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                />
              );
            if (shape.tool === TOOLS.CIRCLE)
              return (
                <Circle
                  key={shape.id}
                  {...commonProps}
                  x={shape.x + shape.width / 2}
                  y={shape.y + shape.height / 2}
                  radius={
                    Math.max(Math.abs(shape.width), Math.abs(shape.height)) / 2
                  }
                />
              );
            if (shape.tool === TOOLS.ARROW)
              return (
                <Arrow
                  key={shape.id}
                  {...commonProps}
                  points={[
                    shape.x,
                    shape.y,
                    shape.x + shape.width,
                    shape.y + shape.height,
                  ]}
                  pointerLength={10}
                  pointerWidth={10}
                />
              );
            return null;
          })}

          {texts.map((t) => (
            <Group
              key={t.id}
              x={t.x}
              y={t.y}
              draggable
              id={t.id}
              onClick={() => handleSelect(t.id)}
              onDblClick={() => handleTextDoubleClick(t)}
              onDragEnd={(e) => handleTransform(e.target, "text")}
            >
              {t.tool === TOOLS.STICKY && (
                <Rect
                  width={120}
                  height={60}
                  fill="#fff9c4"
                  shadowBlur={3}
                  cornerRadius={5}
                />
              )}
              <Text text={t.text} fontSize={t.fontSize} fill={t.color} />
            </Group>
          ))}

          <Transformer
            ref={trRef}
            rotateEnabled={true}
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
            ]}
          />
          {Object.values(cursors).map((c) => (
      <Group key={c.userId}>
        <Circle x={c.x} y={c.y} radius={4} fill="blue" />
        <Text x={c.x + 6} y={c.y - 10} text={c.name} fontSize={12} fill="black" />
      </Group>
    ))}
    {tool === TOOLS.ERASER && (
  <Circle
    x={pointerPos.x}
    y={pointerPos.y}
    radius={10}
    stroke="red"
    dash={[4, 4]}
    listening={false}
  />
)}
      </Layer>
    </Stage>
  </div>
);
};

export default Whiteboard;


