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
  link.href = "https://github.com/Borecjeborec1/Orchidei/releases/download/v1.0.1/orchidei.Setup.1.0.1.zip";
  link.click();
}

async function addToDownloads() {
  const response = await fetch("https://faithful-leggings-toad.cyclic.app/download-info?isDownloading=true").then(res => res.json())
  console.log(response)
}

window.onload = getDownloadStats



async function getDownloadStats() {
  const response = await fetch("https://faithful-leggings-toad.cyclic.app/download-info?isDownloading=false").then(res => res.json())
  console.log(response)
  document.getElementById("animationText").classList.add("bounceIn")
  document.getElementById("downloadCount").innerText = response.dowloads
}

