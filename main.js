let debug = false;

let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let area = document.createElement("canvas");
let areaCtx = area.getContext("2d");

let areaViewX;
let areaViewY;
let areaScale;

let areaChanged;
let undoList;
let undoIndex;

let zoomPreviousX = -1;
let zoomPreviousY = -1;
let zoomAreaX;
let zoomAreaY;

let tool = 0;
let currentColor = "#000000";

let drawPreviousX = NaN;
let drawPreviousY = NaN;

let straightLineStarted = false;
let straightLineDirection;
let straightLineOrigin;

let fileDialog = document.createElement("input");
let colorDialog = document.createElement("input");
let downloadAnchor = document.createElement("a");

let topBar = [
  {
    text: "New",
    action: actionNew
  },
  {
    text: "Open",
    action: actionOpen
  },
  {
    text: "Save",
    action: actionSave
  },
  {
    text: "Change size",
    action: actionChangeSize
  },
  {
    text: "Add color",
    action: actionAddColor
  },
  {
    text: "Undo",
    action: actionUndo
  },
  {
    text: "Redo",
    action: actionRedo
  },
  {
    text: "Reset position",
    action: actionResetZoom
  },
  {
    text: "Help",
    action: actionHelp
  }
];

let bottomBar = [
  {
    text: "Pencil",
    continous: true,
    draw: drawPencil
  },
  {
    text: "Straight line",
    continous: true,
    draw: drawStraightLine,
    stop: stopStraightLine
  },
  {
    text: "Fill",
    draw: drawFill
  },
  {
    text: "Color picker",
    draw: drawEyedropper
  }
];

let colorBar = [
  "#800000",
  "#ff0000",
  "#ff8080",
  "#804000",
  "#ff8000",
  "#ffc080",
  "#808000",
  "#ffff00",
  "#ffff80",
  "#408000",
  "#80ff00",
  "#c0ff80",
  "#008000",
  "#00ff00",
  "#80ff80",
  "#008040",
  "#00ff80",
  "#80ffc0",
  "#008080",
  "#00ffff",
  "#80ffff",
  "#004080",
  "#0080ff",
  "#80c0ff",
  "#000080",
  "#0000ff",
  "#8080ff",
  "#400080",
  "#8000ff",
  "#c080ff",
  "#800080",
  "#ff00ff",
  "#ff80ff",
  "#800040",
  "#ff0080",
  "#ff80c0",
  "#000000",
  "#202020",
  "#404040",
  "#606060",
  "#808080",
  "#a0a0a0",
  "#c0c0c0",
  "#e0e0e0",
  "#ffffff",
];

function setAreaPosition() {
  let heightOption = Math.floor((canvas.height - 22*2) / area.height);
  let widthOption = Math.floor((canvas.width - (32*3+2)*2) / area.width);
  
  if (heightOption <= widthOption) {
    areaScale = heightOption;
  } else {
    areaScale = widthOption;
  }
  
  if (areaScale < 1) {
    areaScale = 1;
  }
  
  areaViewX = Math.floor(canvas.width / 2 - (area.width * areaScale) / 2);
  areaViewY = Math.floor(canvas.height / 2 - (area.height * areaScale) / 2);
}

function pushUndo() {
  areaChanged = false;
  
  if (undoIndex < undoList.length-1) {
    undoList.splice(undoIndex+1);
  }
  
  undoList.push(areaCtx.getImageData(0, 0, area.width, area.height));
  undoIndex++;
  
  if (undoList.length > 50) {
    undoList.shift();
    undoIndex--;
  }
}

function resetUndoState() {
  areaChanged = false;
  undoList = [];
  undoIndex = -1;
  
  pushUndo();
}

function eqPixel(a, b) {
  return a.r == b.r && a.g == b.g && a.b == b.b;
}

function pixelToHex(pixel) {
  let r = pixel.r.toString(16).padStart(2, "0");
  let g = pixel.g.toString(16).padStart(2, "0");
  let b = pixel.b.toString(16).padStart(2, "0");
  
  return `#${r}${g}${b}`;
}

function hexToPixel(hexcode) {
  let r = parseInt(hexcode.slice(1, 3), 16);
  let g = parseInt(hexcode.slice(3, 5), 16);
  let b = parseInt(hexcode.slice(5, 7), 16);
  
  return { r: r, g: g, b: b };
}

function getPixel(imageData, x, y) {
  if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
    return { r: NaN, g: NaN, b: NaN };
  }
  
  let pixel = (y*imageData.width + x) * 4;
  
  return { r: imageData.data[pixel+0], g: imageData.data[pixel+1], b: imageData.data[pixel+2] };
}

function setPixel(imageData, x, y, color) {
  if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
    return;
  }
  
  let pixel = (y*imageData.width + x) * 4;
  
  imageData.data[pixel+0] = color.r;
  imageData.data[pixel+1] = color.g;
  imageData.data[pixel+2] = color.b;
}

function floodFill(imageData, x, y, flooder, floodee) {
  if (!floodee) {
    floodee = getPixel(imageData, x, y);
  }
  
  if (eqPixel(flooder, floodee)) {
    return false;
  }
  
  let queue = [];
  
  let pixelPut = false;
  
  while (true) {
    let upOpen = true;
    let downOpen = true;
    
    while (eqPixel(getPixel(imageData, x, y), floodee)) {
      x--;
    }
    x++;
    
    while (eqPixel(getPixel(imageData, x, y), floodee)) {
      if (eqPixel(getPixel(imageData, x, y-1), floodee)) {
        if (upOpen) {
          queue.push({x: x, y: y-1});
          upOpen = false;
        }
      } else {
        upOpen = true;
      }
      
      if (eqPixel(getPixel(imageData, x, y+1), floodee)) {
        if (downOpen) {
          queue.push({x: x, y: y+1});
          downOpen = false;
        }
      } else {
        downOpen = true;
      }
      
      setPixel(imageData, x, y, flooder);
      pixelPut = true;
      x++;
    }
    
    if (debug) {
      areaCtx.putImageData(imageData, 0, 0);
      redraw();
      
      console.clear();
      
      for (let item in queue) {
        console.log(queue[item]);
      }
    }
    
    let next = queue.pop();
    
    if (next) {
      x = next.x;
      y = next.y;
    } else {
      break;
    }
  }
  
  return pixelPut;
}

// https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm

function drawLineLow(imageData, x0, y0, x1, y1, color) {
  let dx;
  let dy;
  let yi;
  let d;
  
  dx = x1 - x0;
  dy = y1 - y0;
  yi = 1;
  if (dy < 0) {
    yi = -1;
    dy = -dy;
  }
  d = (2 * dy) - dx;
  y = y0;
  
  let x = x0;
  if (x == x1) {
    return;
  }
  while (true) {
    setPixel(imageData, x, y, color);
    if (d > 0) {
      y += yi;
      d += (2 * (dy - dx));
    } else {
      d += 2*dy;
    }
    
    if (x == x1) {
      break;
    }
    
    if (x0 < x1) {
      x++;
    } else {
      x--;
    }
  }
}

function drawLineHigh(imageData, x0, y0, x1, y1, color) {
  let dx;
  let dy;
  let xi;
  let d;
  
  dx = x1 - x0;
  dy = y1 - y0;
  xi = 1;
  if (dx < 0) {
    xi = -1;
    dx = -dx;
  }
  d = (2 * dx) - dy;
  x = x0;
  
  let y = y0;
  if (y == y1) {
    return;
  }
  while (true) {
    setPixel(imageData, x, y, color);
    if (d > 0) {
      x += xi;
      d += (2 * (dx - dy));
    } else {
      d += 2*dx;
    }
    
    if (y == y1) {
      break;
    }
    
    if (y0 < y1) {
      y++;
    } else {
      y--;
    }
  }
}

function drawLine(imageData, x0, y0, x1, y1, color) {
  if (Math.abs(y1 - y0) < Math.abs(x1 - x0)) {
    if (x0 > x1) {
      drawLineLow(imageData, x1, y1, x0, y0, color);
    } else {
      drawLineLow(imageData, x0, y0, x1, y1, color);
    }
  } else {
    if (y0 > y1) {
      drawLineHigh(imageData, x1, y1, x0, y0, color);
    } else {
      drawLineHigh(imageData, x0, y0, x1, y1, color);
    }
  }
}

function dispatchDraw(e) {
  let areaX = Math.floor((e.x - areaViewX) / areaScale);
  let areaY = Math.floor((e.y - areaViewY) / areaScale);
  
  if (areaX < 0 || areaX >= area.width || areaY < 0 || areaY >= area.height) {
    if (drawPreviousX) {
      if (drawPreviousX < 0 || drawPreviousX >= area.width || drawPreviousY < 0 || drawPreviousY >= area.height) {
        drawPreviousX = areaX;
        drawPreviousY = areaY;
        return;
      }
    } else {
      drawPreviousX = areaX;
      drawPreviousY = areaY;
      return;
    }
  }
  
  bottomBar[tool].draw(areaX, areaY, drawPreviousX, drawPreviousY);
  
  drawPreviousX = areaX;
  drawPreviousY = areaY;
  
  redraw();
  return;
}

function initBar(bar) {
  let barOffset = 0;
  
  for (let item in bar) {
    ctx.font = "16px sans-serif";
    bar[item].x = barOffset;
    bar[item].textWidth = ctx.measureText(bar[item].text).width;
    bar[item].width = bar[item].textWidth + 4+4;
    
    barOffset += bar[item].width + 2;
  }
}

function drawBar(bar, x, y) {
  let barOffset = 4;
  
  for (let item in bar) {
    ctx.fillStyle = "#606060";
    
    if (!bar[item].selected) {
      ctx.fillRect(x + barOffset + bar[item].textWidth + 4, y, 2, 20);
    } else {
      ctx.fillRect(x + barOffset - 4 - 1, y, 1 + 4 + bar[item].textWidth + 4 + 2, 20);
    }
    
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.font = "16px sans-serif";
    
    ctx.fillText(bar[item].text, x + barOffset, y + 10);
    
    barOffset += bar[item].textWidth + 4+2+4;
  }
}

function clickBar(bar, e, x) {
  for (let item in bar) {
    if (e.x >= x + bar[item].x && e.x < x + bar[item].x + bar[item].width) {
      if (bar[item].action) {
        bar[item].action();
        return;
      }
    }
  }
}

function clickDrawBar(bar, e, x) {
  for (let item in bar) {
    if (e.x >= x + bar[item].x && e.x < x + bar[item].x + bar[item].width) {
      bar[tool].selected = false;
      
      tool = item;
      
      bar[tool].selected = true;
      
      redraw();
      return;
    }
  }
}

function handleResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  redraw();
}

function handleKeyDown(e) {
  if (e.ctrlKey) {
    switch (e.key) {
      case "s":
        e.preventDefault();
        actionSave();
      break;
      case "z":
        actionUndo();
      break;
      case "Z":
      case "y":
        actionRedo();
      break;
    }
  } else if (e.key.charCodeAt(0) >= 0x30 && e.key.charCodeAt(0) <= 0x39) {
    let possibleTool = parseInt(e.key) - 1;
    
    if (bottomBar[possibleTool]) {
      bottomBar[tool].selected = false;
      
      tool = possibleTool;
      
      bottomBar[tool].selected = true;
      
      redraw();
    }
  }
}

function handleMouseMove(e) {
  if (e.x >= 32*3 + 2 && e.y >= 22 && e.y < canvas.height - 22) {
    if (e.buttons == 1 && bottomBar[tool].continous) {
      dispatchDraw(e);
      return;
    }
    
    if (e.buttons == 2) {
      areaViewX += Math.floor(e.movementX);
      areaViewY += Math.floor(e.movementY);
      
      redraw();
      return;
    }
  }
}

function handleMouseDown(e) {
  if (e.y < 20) {
    clickBar(topBar, e, 0);
    return;
  }
  
  if (e.y >= canvas.height - 20) {
    clickDrawBar(bottomBar, e, 0);
    return;
  }
  
  if (e.x < 32*3) {
    let palY = e.y - 22;
    
    let index = Math.floor(palY / 32) * 3 + Math.floor(e.x / 32);
    
    if (index < colorBar.length) {
      if (e.buttons == 1) {
        currentColor = colorBar[index];
        
        redraw();
      }
      
      if (e.buttons == 2) {
        colorBar.splice(index, 1);
        
        redraw();
      }
    }
    
    return;
  }
  
  if (e.buttons == 1 && e.x >= 32*3 + 2 && e.y >= 22 && e.y < canvas.height - 22) {
    dispatchDraw(e);
    return;
  }
}

function handleMouseUp(e) {
  if (areaChanged) {
    pushUndo();
  }
  
  if (bottomBar[tool].stop) {
    bottomBar[tool].stop();
  }
  
  drawPreviousX = NaN;
  drawPreviousY = NaN;
}

function handleWheel(e) {
  if (e.x >= 32*3 + 2 && e.y >= 22 && e.y < canvas.height - 22) {
    if (e.x != zoomPreviousX || e.y != zoomPreviousY) {
      zoomAreaX = (e.x - areaViewX) / areaScale;
      zoomAreaY = (e.y - areaViewY) / areaScale;
      zoomPreviousX = e.x;
      zoomPreviousY = e.y;
    }
    
    if (e.deltaY < 0) {
      areaScale++;
    } else {
      areaScale--;
      
      if (areaScale < 1) {
        areaScale = 1;
      }
    }
    
    areaViewX = Math.floor(e.x - zoomAreaX * areaScale);
    areaViewY = Math.floor(e.y - zoomAreaY * areaScale);
    
    redraw();
  }
}

async function handleFileDialog(e) {
  let bitmap = await createImageBitmap(fileDialog.files[0]);
  
  area.width = bitmap.width;
  area.height = bitmap.height;
  
  areaCtx.drawImage(bitmap, 0, 0);
  
  resetUndoState();
  setAreaPosition();
  
  bitmap.close();
  
  redraw();
}

function handleColorDialog(e) {
  colorBar[colorBar.length-1] = colorDialog.value;
  currentColor = colorDialog.value;
  
  redraw();
}

function actionNew() {
  if (confirm("Are you sure?")) {
    let width = parseInt(prompt("Width?"));
    
    while (Number.isNaN(width) || width <= 0) {
      width = parseInt(prompt("Width?"));
    }
    
    let height = parseInt(prompt("Height?"));
    
    while (Number.isNaN(height) || height <= 0) {
      height = parseInt(prompt("Height?"));
    }
    
    area.width = width;
    area.height = height;
    
    setAreaPosition();
    
    areaCtx.fillStyle = "#ffffff";
    areaCtx.fillRect(0, 0, width, height);
    
    resetUndoState();
    
    redraw();
  }
}

function actionOpen() {
  fileDialog.click();
}

function actionSave() {
  if (downloadAnchor.href) {
    URL.revokeObjectURL(downloadAnchor.href);
  }
  
  area.toBlob((blob) => {
    downloadAnchor.href = URL.createObjectURL(blob);
    downloadAnchor.click();
  });
}

function actionChangeSize() {
  let width = parseInt(prompt("Width?"));
  
  while (Number.isNaN(width) || width <= 0) {
    width = parseInt(prompt("Width?"));
  }
  
  let height = parseInt(prompt("Height?"));
  
  while (Number.isNaN(height) || height <= 0) {
    height = parseInt(prompt("Height?"));
  }
  
  let newArea = document.createElement("canvas");
  let newAreaCtx = newArea.getContext("2d");
  
  newArea.width = width;
  newArea.height = height;
  
  newAreaCtx.fillStyle = "#ffffff";
  newAreaCtx.fillRect(0, 0, width, height);
  
  newAreaCtx.drawImage(area, 0, 0);
  
  area.remove();
  
  area = newArea;
  areaCtx = newAreaCtx;
  
  resetUndoState();
  setAreaPosition();
  
  redraw();
}

function actionAddColor() {
  colorBar.push("#000000");
  colorDialog.click();
  
  redraw();
}

function actionUndo() {
  if (undoIndex > 0) {
    areaCtx.putImageData(undoList[undoIndex-1], 0, 0);
    
    undoIndex--;
    
    redraw();
  }
}

function actionRedo() {
  if (undoIndex < undoList.length-1) {
    areaCtx.putImageData(undoList[undoIndex+1], 0, 0);
    
    undoIndex++;
    
    redraw();
  }
}

function actionResetZoom() {
  setAreaPosition();
  redraw();
}

function actionHelp() {
  alert("Image controls:\n" +
        "Use the left mouse button to use the selected tool\n" +
        "Use the scroll wheel to zoom\n" +
        "Use the right mouse button to move around\n" +
        "\n" +
        "Top bar:\n" +
        "New - Create a new image\n" +
        "Open - Open a saved image\n" +
        "Save (Ctrl+s) - Save the image to your system\n" +
        "Change size - Change size of current image\n" +
        "Add color - Add a color using a color picker dialog\n" +
        "Undo (Ctrl+z) - Undo a change\n" +
        "Redo (Ctrl+y or Ctrl+Shift+z) - Redo a change\n" +
        "Reset position - Reset zoom and position of image to default\n" +
        "\n" +
        "Bottom bar:\n" +
        "You may use keys 1-4 to select\n" +
        "Pencil - Draw normally\n" +
        "Straight line - Draw either a horizontal or vertical line\n" +
        "Fill - Fill an area\n" +
        "Color picker - Add a color from the image\n" +
        "\n" +
        "Color sidebar:\n" +
        "Use the left mouse button to select the color\n" +
        "Use the right mouse button to remove one");
}

function drawPencil(x, y, pX, pY) {
  if (!isNaN(pX)) {
    let imageData = areaCtx.getImageData(0, 0, area.width, area.height);
    
    drawLine(imageData, pX, pY, x, y, hexToPixel(currentColor));
    
    areaCtx.putImageData(imageData, 0, 0);
  } else {
    areaCtx.fillStyle = currentColor;
    areaCtx.fillRect(x, y, 1, 1);
  }
  
  areaChanged = true;
}

function drawStraightLine(x, y, pX, pY) {
  if (!isNaN(pX)) {
    if (!straightLineStarted) {
      let dX = Math.abs(x - pX);
      let dY = Math.abs(y - pY);
      
      if (dX > dY) {
        straightLineDirection = 0;
        straightLineOrigin = pY;
        straightLineStarted = true;
      } else if (dY > dX) {
        straightLineDirection = 1;
        straightLineOrigin = pX;
        straightLineStarted = true;
      }
    }
    
    if (straightLineStarted) {
      let imageData = areaCtx.getImageData(0, 0, area.width, area.height);
      
      if (straightLineDirection == 0) {
        drawLine(imageData, pX, straightLineOrigin, x, straightLineOrigin, hexToPixel(currentColor));
      } else {
        drawLine(imageData, straightLineOrigin, pY, straightLineOrigin, y, hexToPixel(currentColor));
      }
      
      areaCtx.putImageData(imageData, 0, 0);
      areaChanged = true;
    }
  }
}

function stopStraightLine() {
  straightLineStarted = false;
}

function drawFill(x, y) {
  let imageData = areaCtx.getImageData(0, 0, area.width, area.height);
  
  if (!floodFill(imageData, x, y, hexToPixel(currentColor))) {
    return;
  }
  
  areaCtx.putImageData(imageData, 0, 0);
  
  areaChanged = true;
}

function drawEyedropper(x, y) {
  let imageData = areaCtx.getImageData(0, 0, area.width, area.height);
  let color = pixelToHex(getPixel(imageData, x, y));
  
  currentColor = color;
  
  if (!colorBar.includes(color)) {
    colorBar.push(color);
  }
}

function redraw() {
  ctx.fillStyle = "#202020";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(area, areaViewX, areaViewY, area.width*areaScale, area.height*areaScale);
  
  ctx.fillStyle = "#00000080";
  ctx.fillRect(0, 20 + 2, 32*3, canvas.height - 22*2);
  
  ctx.fillStyle = "#606060";
  ctx.fillRect(32*3, 20 + 2, 2, canvas.height - 22*2);
  
  let colorBarOffsetX = 0
  let colorBarOffsetY = 0
  
  for (let color in colorBar) {
    ctx.fillStyle = colorBar[color];
    ctx.fillRect(colorBarOffsetX, 20 + 2 + colorBarOffsetY, 32, 32);
    
    colorBarOffsetX += 32;
    
    if (colorBarOffsetX == 32*3) {
      colorBarOffsetX = 0;
      colorBarOffsetY += 32;
    }
  }
  
  ctx.fillStyle = currentColor;
  ctx.fillRect(0, canvas.height - 22 - 32, 32, 32);
  
  ctx.fillStyle = "#00000080";
  ctx.fillRect(0, 0, canvas.width, 20);
  
  ctx.fillStyle = "#606060";
  ctx.fillRect(0, 20, canvas.width, 2);
  
  drawBar(topBar, 0, 0);
  
  ctx.fillStyle = "#00000080";
  ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
  
  ctx.fillStyle = "#606060";
  ctx.fillRect(0, canvas.height - 22, canvas.width, 2);
  
  drawBar(bottomBar, 0, canvas.height - 20);
}

function init() {
  fileDialog.type = "file";
  fileDialog.accept = "image/*";
  
  colorDialog.type = "color";
  
  downloadAnchor.download = "image.png";
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  area.width = 32;
  area.height = 32;
  
  setAreaPosition();
  
  areaCtx.fillStyle = "#ffffff";
  areaCtx.fillRect(0, 0, 32, 32);
  
  resetUndoState();
  
  initBar(topBar);
  initBar(bottomBar);
  
  bottomBar[tool].selected = true;
  
  redraw();
}

init();

window.addEventListener("resize", handleResize);

window.addEventListener("beforeunload", (e) => {
  e.preventDefault();
  e.returnValue = "You have unsaved changes";
  return "You have unsaved changes";
});

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("mousemove", handleMouseMove);
document.addEventListener("mousedown", handleMouseDown);
document.addEventListener("mouseup", handleMouseUp);
document.addEventListener("wheel", handleWheel);

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

fileDialog.addEventListener("change", handleFileDialog);
colorDialog.addEventListener("change", handleColorDialog);
