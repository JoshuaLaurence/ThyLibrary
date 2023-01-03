import { constructBooks, deleteBookWithID } from './scene.js';

const bookContainer = document.getElementById('AddBookMenu');
const bookForm = document.getElementById('AddBookForm');
const bookTitle = document.getElementById('bookTitle'),
	author = document.getElementById('author');

const deleteBook = document.getElementById('DeleteBookButton');
const URL = 'https://thylibrary-backend.onrender.com';

const socket = io();

bookForm.addEventListener('submit', (event) => {
	const bodyData = {
		title: bookTitle.value,
		author: author.value,
	};
	event.preventDefault();
	console.log('submitted');
	fetch(`${URL}/books`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(bodyData),
	})
		.then((res) => res.json())
		.then((data) => {
			bookForm.reset();
			bookContainer.style.display = 'none';
			socket.emit('newBook', data);
			constructBooks([data], true);
		});
});

deleteBook.addEventListener('click', (event) => {
	event.preventDefault();
	if (event.target.innerText === 'Are you sure?') {
		deleteBookWithID(document.getElementById('hiddenBookId').value);
	} else {
		event.target.innerText = 'Are you sure?';
	}
});
