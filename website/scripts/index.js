function displayDocs(currentElement) {
  let lastElement = currentElement.parentElement.querySelector(".selected")
  lastElement.classList.remove("selected")
  document.getElementById(lastElement.dataset.path).style.display = "none"
  document.getElementById(currentElement.dataset.path).style.display = "block"
  currentElement.classList.add("selected")
}

function downloadWindows() {
  addToDownloads()
  var link = document.createElement("a");
  // link.download = name;
  link.href = "http://127.0.0.1:5502/index.html#downloads";
  link.click();
}

async function addToDownloads() {
  const response = await fetch("https://faithful-leggings-toad.cyclic.app/download-info/").then(res => res.json())
  console.log(response)
}

window.onload = getDownloadStats



async function getDownloadStats() {
  const response = await fetch("https://faithful-leggings-toad.cyclic.app/read-download-info/").then(res => res.json())
  console.log(response)
  document.getElementById("downloadCount").innerText = response.dowloads
}