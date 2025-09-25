import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Rect, Circle, Text, Arrow, Group, Transformer } from "react-konva";
import { io } from "socket.io-client";
import { nanoid } from "nanoid";

const socket = io("http://localhost:4000");

const TOOLS = {
  PEN: "pen",
  HIGHLIGHTER: "highlighter",
  RECTANGLE: "rectangle",
  CIRCLE: "circle",
  ARROW: "arrow",
  TEXT: "text",
  STICKY: "sticky",
};

const Whiteboard = () => {
  const [tool, setTool] = useState(TOOLS.PEN);
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [lines, setLines] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [texts, setTexts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  const isDrawing = useRef(false);
  const stageRef = useRef();
  const trRef = useRef();

  // --- Socket listeners ---
  useEffect(() => {
    socket.on("whiteboard:init", (data) => {
      setLines(data.lines || []);
      setShapes(data.shapes || []);
      setTexts(data.texts || []);
    });

    socket.on("whiteboard-line", (line) => setLines(prev => [...prev, line]));
    socket.on("whiteboard-shape", (shape) => setShapes(prev => [...prev, shape]));
    socket.on("whiteboard-text", (text) => setTexts(prev => [...prev, text]));
    socket.on("whiteboard-transform", (updated) => {
      if (updated.type === "shape") setShapes(prev => prev.map(s => s.id === updated.id ? updated : s));
      else if (updated.type === "text") setTexts(prev => prev.map(t => t.id === updated.id ? updated : t));
    });
    socket.on("whiteboard-clear", () => {
      setLines([]); setShapes([]); setTexts([]);
    });

    return () => {
      socket.off("whiteboard:init");
      socket.off("whiteboard-line");
      socket.off("whiteboard-shape");
      socket.off("whiteboard-text");
      socket.off("whiteboard-transform");
      socket.off("whiteboard-clear");
    };
  }, []);

  // --- Mouse Handlers ---
  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    const clickedOnEmpty = e.target === stage;
    if (clickedOnEmpty) setSelectedId(null);

    if (!clickedOnEmpty) return;

    const pos = stage.getPointerPosition();
    isDrawing.current = true;

    if (tool === TOOLS.PEN || tool === TOOLS.HIGHLIGHTER) {
      const newLine = { id: nanoid(), points: [pos.x, pos.y], tool, color, strokeWidth };
      setLines(prev => [...prev, newLine]);
      socket.emit("whiteboard-line", newLine);
    } else if ([TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.ARROW].includes(tool)) {
      const newShape = { id: nanoid(), x: pos.x, y: pos.y, width: 0, height: 0, tool, color, strokeWidth };
      setShapes(prev => [...prev, newShape]);
      socket.emit("whiteboard-shape", newShape);
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
      setTexts(prev => [...prev, newText]);
      socket.emit("whiteboard-text", newText);
      setEditingTextId(id);
      setEditingTextValue(newText.text);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const pos = e.target.getStage().getPointerPosition();

    if (tool === TOOLS.PEN || tool === TOOLS.HIGHLIGHTER) {
      setLines(prev => {
        const lastLine = prev[prev.length - 1];
        lastLine.points = lastLine.points.concat([pos.x, pos.y]);
        socket.emit("whiteboard-line", lastLine);
        return [...prev.slice(0, -1), lastLine];
      });
    } else if ([TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.ARROW].includes(tool)) {
      setShapes(prev => {
        const lastShape = prev[prev.length - 1];
        lastShape.width = pos.x - lastShape.x;
        lastShape.height = pos.y - lastShape.y;
        socket.emit("whiteboard-transform", { ...lastShape, type: "shape" });
        return [...prev.slice(0, -1), lastShape];
      });
    }
  };

  const handleMouseUp = () => { isDrawing.current = false; };

  // --- Selection & Transformer ---
  useEffect(() => {
    if (trRef.current) {
      if (selectedId) {
        const node = stageRef.current.findOne(`#${selectedId}`);
        if (node) trRef.current.nodes([node]);
        trRef.current.getLayer().batchDraw();
      } else trRef.current.nodes([]);
    }
  }, [selectedId, shapes, texts]);

  const handleSelect = (id) => setSelectedId(id);

  const handleTransform = (node, type) => {
    const id = node.id();
    if (!id) return;

    const updated = {
      id,
      x: node.x(),
      y: node.y(),
      width: node.width() * node.scaleX(),
      height: node.height() * node.scaleY(),
      rotation: node.rotation(),
      tool: type === "shape" ? shapes.find(s => s.id === id)?.tool : texts.find(t => t.id === id)?.tool,
      color: type === "shape" ? shapes.find(s => s.id === id)?.color : texts.find(t => t.id === id)?.color,
      text: type === "text" ? node.text() : undefined,
      type,
    };

    if (type === "shape") setShapes(prev => prev.map(s => s.id === id ? updated : s));
    else if (type === "text") setTexts(prev => prev.map(t => t.id === id ? updated : t));

    socket.emit("whiteboard-transform", updated);
  };

  // --- Text Editing ---
  const handleTextDoubleClick = (text) => {
    setEditingTextId(text.id);
    setEditingTextValue(text.text);
  };
  const handleTextChange = (e) => setEditingTextValue(e.target.value);
  const handleTextSubmit = () => {
    if (!editingTextId) return;
    setTexts(prev => prev.map(t => t.id === editingTextId ? { ...t, text: editingTextValue } : t));
    socket.emit("whiteboard-transform", { id: editingTextId, text: editingTextValue, type: "text" });
    setEditingTextId(null);
    setEditingTextValue("");
  };
  const handleKeyDown = (e) => { if (e.key === "Enter") handleTextSubmit(); };

  // --- Clear & Export ---
  const handleClear = () => { setLines([]); setShapes([]); setTexts([]); socket.emit("whiteboard-clear"); };
  const handleExport = () => {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL();
    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = uri;
    link.click();
  };

  return (
    <div className="p-4 relative">
      <h2 className="text-xl font-bold mb-2">🎨 Pro Whiteboard (Multiuser)</h2>

      <div className="mb-2 space-x-2">
        <select value={tool} onChange={e => setTool(e.target.value)} className="px-2 py-1 border rounded">
          {Object.values(TOOLS).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="color" value={color} onChange={e => setColor(e.target.value)} />
        <input type="number" min={1} max={50} value={strokeWidth} onChange={e => setStrokeWidth(parseInt(e.target.value))} />
        <button onClick={handleClear} className="px-2 py-1 bg-red-500 text-white rounded">Clear</button>
        <button onClick={handleExport} className="px-2 py-1 bg-green-500 text-white rounded">Export</button>
      </div>

      {editingTextId && (
        <input
          type="text"
          value={editingTextValue}
          onChange={handleTextChange}
          onBlur={handleTextSubmit}
          onKeyDown={handleKeyDown}
          className="absolute z-50 p-1 border rounded"
          style={{
            left: texts.find(t => t.id === editingTextId)?.x || 0,
            top: texts.find(t => t.id === editingTextId)?.y || 0,
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
        className="border-2 border-gray-300 rounded-lg"
      >
        <Layer>
          {lines.map(line => (
            <Line
              key={line.id}
              points={line.points}
              stroke={line.tool === TOOLS.HIGHLIGHTER ? line.color + "55" : line.color}
              strokeWidth={line.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          ))}

          {shapes.map(shape => {
            const commonProps = {
              stroke: shape.color,
              strokeWidth: shape.strokeWidth,
              id: shape.id,
              draggable: true,
              onClick: () => handleSelect(shape.id),
              onDragEnd: (e) => handleTransform(e.target, "shape"),
              onTransformEnd: (e) => handleTransform(e.target, "shape")
            };
            if (shape.tool === TOOLS.RECTANGLE) return <Rect key={shape.id} {...commonProps} x={shape.x} y={shape.y} width={shape.width} height={shape.height} />;
            if (shape.tool === TOOLS.CIRCLE) return <Circle key={shape.id} {...commonProps} x={shape.x + shape.width/2} y={shape.y + shape.height/2} radius={Math.max(Math.abs(shape.width), Math.abs(shape.height))/2} />;
            if (shape.tool === TOOLS.ARROW) return <Arrow key={shape.id} {...commonProps} points={[shape.x, shape.y, shape.x + shape.width, shape.y + shape.height]} pointerLength={10} pointerWidth={10} />;
            return null;
          })}

          {texts.map(t => (
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
              {t.tool === TOOLS.STICKY && <Rect width={120} height={60} fill="#fff9c4" shadowBlur={3} cornerRadius={5} />}
              <Text text={t.text} fontSize={t.fontSize} fill={t.color} />
            </Group>
          ))}

          <Transformer
            ref={trRef}
            rotateEnabled={true}
            enabledAnchors={['top-left','top-right','bottom-left','bottom-right']}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default Whiteboard;
