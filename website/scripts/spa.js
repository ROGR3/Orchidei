
const routes = {
  404: "/views/404.html",
  home: "/views/home.html",
  docs: "/views/docs.html",
  downloads: "/views/downloads.html",
};
async function handleLocation() {
  let lis = document.querySelectorAll(".navli")
  let path = window.location.hash.replace("#", "") || "home";
  if (path == "home") getDownloadStats()
  let route = routes[path] || routes[404];
  let html = await fetch(route).then((data) => data.text());
  document.getElementById("container").innerHTML = html;
  lis.forEach(li => {
    li.classList.remove("selected")
    if (li.firstElementChild.href.includes(path)) {
      li.classList.add("selected")
    }
  })
};

window.onhashchange = handleLocation;

handleLocation()


