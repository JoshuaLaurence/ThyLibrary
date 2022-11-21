import {constructBooks} from "./scene.js"

const bookContainer = document.getElementById("AddBookMenu")
const bookForm = document.getElementById("AddBookForm")
const bookTitle = document.getElementById("bookTitle"),
    author = document.getElementById("author")
const URL = "https://thylibrary-backend.onrender.com"


bookForm.addEventListener("submit", (event) => {
    const bodyData = {
        title: bookTitle.value,
        author: author.value,
    }
    event.preventDefault()
    console.log("submitted")
    fetch(`${URL}/books`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(bodyData)
    }).then((res) => res.json())
    .then((data) => {
        bookForm.reset()
        bookContainer.style.display = "none"
        console.log(data)
        constructBooks([data], true)
    })
})
