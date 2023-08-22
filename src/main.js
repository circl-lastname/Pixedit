let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let area = document.createElement("canvas");
let areaCtx = area.getContext("2d");

let areaViewX = 32*3 + 2;
let areaViewY = 20 + 2;

let areaScale = 16;

let currentColor = "#000000";

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
    text: "Reset position",
    action: actionResetZoom
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

function drawBar(bar) {
  let barOffset = 4;
  
  for (let item in bar) {
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.font = "16px sans-serif";
    
    ctx.fillText(bar[item].text, barOffset, 10);
    
    ctx.fillStyle = "#808080";
    ctx.fillRect(barOffset + bar[item].textWidth + 4, 0, 2, 20);
    
    barOffset += bar[item].textWidth + 4+2+4;
  }
}

function clickBar(bar, e) {
  for (let item in bar) {
    if (e.x >= bar[item].x && e.x < bar[item].x + bar[item].width) {
      if (bar[item].action) {
        bar[item].action();
        return;
      }
    }
  }
}

function handleResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  redraw();
}

function handleMouseMove(e) {
  if (e.x >= 32*3 + 2 && e.y >= 22) {
    if (e.buttons == 1) {
      let areaX = Math.floor((e.x - areaViewX) / areaScale);
      let areaY = Math.floor((e.y - areaViewY) / areaScale);
      
      areaCtx.fillStyle = currentColor;
      areaCtx.fillRect(areaX, areaY, 1, 1);
      
      redraw();
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
    clickBar(topBar, e);
    return;
  }
  
  if (e.x < 32*3) {
    let palY = e.y - 22;
    
    let index = Math.floor(palY / 32) * 3 + Math.floor(e.x / 32);
    
    if (index <= colorBar.length) {
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
  
  if (e.buttons == 1 && e.x >= 32*3 + 2 && e.y >= 22) {
    let areaX = Math.floor((e.x - areaViewX) / areaScale);
    let areaY = Math.floor((e.y - areaViewY) / areaScale);
    
    areaCtx.fillStyle = currentColor;
    areaCtx.fillRect(areaX, areaY, 1, 1);
    
    redraw();
    return;
  }
}

function handleWheel(e) {
  if (e.x >= 32*3 + 2 && e.y >= 22) {
    if (e.deltaY < 0) {
      areaScale++;
    } else {
      areaScale--;
      
      if (areaScale < 1) {
        areaScale = 1;
      }
    }
    
    redraw();
  }
}

async function handleFileDialog(e) {
  let bitmap = await createImageBitmap(fileDialog.files[0]);
  
  area.width = bitmap.width;
  area.height = bitmap.height;
  
  areaCtx.drawImage(bitmap, 0, 0);
  
  bitmap.close();
  
  redraw();
}

function handleColorDialog(e) {
  colorBar[colorBar.length-1] = colorDialog.value;
  
  redraw();
}

function actionNew() {
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
  
  areaCtx.fillStyle = "#ffffff";
  areaCtx.fillRect(0, 0, width, height);
  
  redraw();
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
  
  redraw();
}

function actionAddColor() {
  colorBar.push("#000000");
  colorDialog.click();
  
  redraw();
}

function actionResetZoom() {
  areaViewX = 32*3 + 2;
  areaViewY = 20 + 2;
  
  areaScale = 1;
  
  redraw();
}

function redraw() {
  ctx.fillStyle = "#202020";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(area, areaViewX, areaViewY, area.width*areaScale, area.height*areaScale);
  
  ctx.fillStyle = "#404040";
  ctx.fillRect(0, 20 + 2, 32*3, canvas.height - 20 - 2);
  
  ctx.fillStyle = "#808080";
  ctx.fillRect(32*3, 20 + 2, 2, canvas.height - 20 - 2);
  
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
  ctx.fillRect(0, canvas.height - 32, 32, 32);
  
  ctx.fillStyle = "#404040";
  ctx.fillRect(0, 0, canvas.width, 20);
  
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 20, canvas.width, 2);
  
  drawBar(topBar);
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
  
  areaCtx.fillStyle = "#ffffff";
  areaCtx.fillRect(0, 0, 32, 32);
  
  initBar(topBar);
  
  redraw();
}

init();

window.addEventListener("resize", handleResize);

canvas.addEventListener("mousemove", handleMouseMove);
canvas.addEventListener("mousedown", handleMouseDown);
canvas.addEventListener("wheel", handleWheel);

fileDialog.addEventListener("change", handleFileDialog);
colorDialog.addEventListener("change", handleColorDialog);

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});
