function displayDocs(currentElement) {
  let lastElement = currentElement.parentElement.querySelector(".selected")
  lastElement.classList.remove("selected")
  document.getElementById(lastElement.dataset.path).style.display = "none"
  document.getElementById(currentElement.dataset.path).style.display = "block"
  currentElement.classList.add("selected")
}