import * as THREE from 'three';
import { PointerLockControls } from '../jsm/controls/PointerLockControls.js';
import { GLTFLoader } from '../jsm/loaders/GLTFLoader.js';
import { FontLoader } from '../jsm/loaders/FontLoader.js';
import { TextGeometry } from '../jsm/geometries/TextGeometry.js';
//import {TextGeometry} from "../jsm/geometries/TextGeometry.js"
import { Sky } from '../jsm/objects/Sky.js';
import { DirectionalLight, Vector3 } from 'three';

const socket = io();

//import { DragControls } from './jsm/controls/DragControls.js'

let scene, renderer, camera, controls, cube, raycaster, light;
let clients = new Object();
let id;
let INTERSECTED = false;
let moveForward = false,
	moveBackward = false,
	moveLeft = false,
	moveRight = false;
let theAudioListener = new THREE.AudioListener();
let daytimeClock = new THREE.Clock();
let daytimeCheck = 0;
let globalTimeOfDay;
let flashlight;
let URL = 'https://thylibrary-backend.onrender.com';
let raycasterObjects = [],
	excludedObjects = [];
let time;
let bookBand;
let username;
let username3D;

let moveToCamera = [false, 'toward'];

let sun, sky;
let previousTime = performance.now();

let startingLoad = true;

const center = new THREE.Vector2(0, 0);
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const manager = new THREE.LoadingManager();
const fontLoader = new FontLoader();
const loader = new GLTFLoader(manager);
const pauseMenu = document.getElementById('PausedMenu');
const addBookMenu = document.getElementById('AddBookMenu');
const dismissAddBookMenu = document.getElementById('DismissBookMenuButton');
const loadingScreen = document.getElementById('LoadingScreen');
const loadedButton = document.getElementsByClassName('LoadedButton')[0];
const loadingBar = document.getElementById('ProgressBar');
const loadingBarContainer = document.getElementById('ProgressBarContainer');
const loadingString = document.getElementsByClassName('LoadingLabel')[0];
const loadingTip = document.getElementsByClassName('LoadingScreenTip')[0];
const permanentText = document.getElementsByClassName('PermanentTextBox')[0];
const informationScreen = document.getElementById('InformationScreen');

const settingsScreen = document.getElementById('SettingsPage');
const settingsButton = document.getElementsByClassName('OpenSettingsPage')[0];
const settingsInternalScreen = document.getElementsByClassName(
	'SettingsPageInternal'
)[0];
const settingsResolutionSlider = document.getElementById('ResolutionSlider');
const settingsTimeOfDaySlider = document.getElementById('TimeOfDay');
//const fadeIn = document.querySelector(".fadeIn")
const wittyLoadingMessages = [
	'Assembling Poorly Built Code...',
	'Engaging In Wizardry...',
	'Building Stuff...',
	'Downloading More RAM...',
	'Feeding unicorns...',
	'TODO: Insert elevator music...',
	'Running with scissors...',
	'Reversing the shield polarity...',
];

const wittyLoadingTips = [
	'Does anyone actually read these?',
	'All loading screens have been removed for your convenience',
	'Did you know that tips are shown during the loading screen?',
	'If everything breaks, which it may, refresh the page',
	'Death is bad. Try to avoid it',
	'Did you know if you close your tab, the website disappears?',
];
let loadingInterval;

// document.addEventListener("visibilitychange", function(e) {
// 	controls.unlock()
// })

manager.onStart = function (url, itemsLoaded, itemsTotal) {
	if (startingLoad) {
		controls.unlock();
		loadingScreen.style.display = 'block';
		pauseMenu.style.display = 'none';
		loadedButton.style.display = 'none';
		loadingString.innerText =
			wittyLoadingMessages[
				Math.floor(Math.random() * wittyLoadingMessages.length)
			];
		loadingTip.innerText =
			wittyLoadingTips[
				Math.floor(Math.random() * wittyLoadingTips.length)
			];
	}
};

manager.onProgress = function (url, itemsLoaded, itemsTotal) {
	if (startingLoad) {
		const total = Math.floor((itemsLoaded / itemsTotal) * 100);
		loadingBar.style.width = `${total}%`;
		loadingBar.innerText = `${total}%`;
	}
};

manager.onLoad = function (url, itemsLoaded, itemsTotal) {
	if (startingLoad) {
		loadingBar.innerText = 'Fetching Data From Database';
		loadingInterval = setInterval(() => {
			if (loadingBar.innerText === 'Fetching Data From Database...') {
				loadingBar.innerText = 'Fetching Data From Database';
			} else {
				loadingBar.innerText += '.';
			}
		}, 500);
	}
};

manager.onError = function (url) {
	console.log('There was an error loading ' + url);
};

function init() {
	scene = new THREE.Scene();

	// fontLoader.load(
	// 	'../fonts/optimer_regular.typeface.json',
	// 	function (response) {
	// 		username3D = new TextGeometry(username, {
	// 			font: response,
	// 			size: 40,
	// 			height: 2,
	// 		});
	// 	}
	// );

	//Sockets
	socket.on('introduction', (_id, _clientNum, _ids, _allClients) => {
		for (let i = 0; i < _ids.length; i++) {
			if (_ids[i] != _id) {
				const player = new THREE.Mesh(
					new THREE.BoxGeometry(1, 1, 1),
					new THREE.MeshNormalMaterial()
				);
				player.scale.set(0.3, 0.3, 0.3);

				player.userData = {
					type: 'player',
					id: _ids[i],
				};
				clients[_ids[i]] = {
					mesh: player,
					name: _allClients[_ids[i]].name,
					currentlyReading: '',
				};

				//Add initial users to the scene
				scene.add(clients[_ids[i]].mesh);

				raycasterObjects.push(clients[_ids[i]].mesh);
			}
		}

		id = _id;
	});
	socket.on('newNames', (_allClients) => {
		for (let i = 0; i < Object.keys(_allClients).length; i++) {
			if (Object.keys(_allClients)[i] != id) {
				clients[Object.keys(_allClients)[i]].name =
					_allClients[Object.keys(_allClients)[i]].name;
			}
		}
	});
	socket.on('usersReading', (_allClients) => {
		for (let i = 0; i < Object.keys(_allClients).length; i++) {
			if (Object.keys(_allClients)[i] != id) {
				clients[Object.keys(_allClients)[i]].currentlyReading =
					_allClients[Object.keys(_allClients)[i]].currentlyReading;
			}
		}
	});
	// socket.on('connect', () => {});
	socket.on('userPositions', (_clientProps) => {
		for (let i = 0; i < Object.keys(_clientProps).length; i++) {
			if (Object.keys(_clientProps)[i] != id) {
				//Store the values
				let newPos =
					_clientProps[Object.keys(_clientProps)[i]].position;
				let newRot =
					_clientProps[Object.keys(_clientProps)[i]].rotation;

				clients[Object.keys(_clientProps)[i]].mesh.position.lerp(
					new THREE.Vector3(newPos[0], newPos[1], newPos[2]),
					0.3
				);
				clients[Object.keys(_clientProps)[i]].mesh.quaternion.slerp(
					new THREE.Quaternion(
						newRot[0],
						newRot[1],
						newRot[2],
						newRot[3]
					),
					0.3
				);
			}
		}
	});
	socket.on('newUserConnected', (clientCount, _id, _ids, _allClients) => {
		let alreadyHasUser = false;
		for (let i = 0; i < Object.keys(clients).length; i++) {
			if (Object.keys(clients)[i] == _id) {
				alreadyHasUser = true;
				break;
			}
		}
		if (_id != id && !alreadyHasUser) {
			const player = new THREE.Mesh(
				new THREE.BoxGeometry(1, 1, 1),
				new THREE.MeshNormalMaterial()
			);
			player.scale.set(0.3, 0.3, 0.3);
			player.userData = { type: 'player', id: _id };
			clients[_id] = {
				mesh: player,
				name: _allClients[_id].name,
				currentlyReading: '',
			};
			scene.add(clients[_id].mesh);
			raycasterObjects.push(clients[_id].mesh);
			//Add initial users to the scen
		}
	});

	socket.on('reconstructBooks', (_id, data) => {
		if (_id != id) {
			constructBooks([data], true);
		}
	});

	socket.on('userDisconnected', (clientCount, _id, _ids) => {
		//Update the data from the server
		if (_id != id) {
			scene.remove(clients[_id].mesh);
			delete clients[_id];
		}
	});

	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 0.65;
	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	document.body.appendChild(renderer.domElement);

	camera = new THREE.PerspectiveCamera(
		70,
		window.innerWidth / window.innerHeight,
		1,
		500
	);
	camera.position.set(0, 1.5, -5);
	camera.scale.set(0.1, 0.1, 0.1);
	camera.add(theAudioListener);
	controls = new PointerLockControls(camera, renderer.domElement);
	controls.lock();
	loadedButton.addEventListener('click', (event) => {
		if (document.getElementById('username').value !== '') {
			loadingScreen.style.display = 'none';
			// username = document.getElementById('username').value;
			socket.emit('saveName', document.getElementById('username').value);
			controls.lock();
		} else {
			document
				.getElementById('username')
				.classList.add('usernameRequired');
			document.getElementById('username').placeholder =
				'Please enter a username';
		}
	});

	dismissAddBookMenu.addEventListener('click', (event) => {
		addBookMenu.style.display = 'none';
		controls.lock();
	});

	pauseMenu.addEventListener('click', (event) => {
		controls.lock();
	});

	informationScreen.addEventListener('click', (event) => {
		if (event.target.id !== 'DeleteBookButton') {
			moveToCamera[0] = true;
			controls.lock();
		}
	});

	settingsScreen.addEventListener('click', (event) => {
		event.stopPropagation();
	});

	settingsButton.addEventListener('click', (event) => {
		settingsInternalScreen.classList.toggle('collapse');
	});
	settingsResolutionSlider.addEventListener('input', (event) => {
		document.getElementById(
			'ResolutionSliderLabel'
		).innerText = `Resolution: ${settingsResolutionSlider.value}x`;
		renderer.setPixelRatio(
			window.devicePixelRatio * settingsResolutionSlider.value
		);
		renderer.render(scene, camera);
	});
	settingsTimeOfDaySlider.addEventListener('input', (event) => {
		const TOD = settingsTimeOfDaySlider.value;
		switch (+TOD) {
			case 1: {
				document.getElementById(
					'TimeOfDayLabel'
				).innerText = `Time Of Day: Daylight`;
				changeDaylight('daylight');
				break;
			}
			case 2: {
				document.getElementById(
					'TimeOfDayLabel'
				).innerText = `Time Of Day: Evening`;
				changeDaylight('evening');
				break;
			}
			case 3: {
				document.getElementById(
					'TimeOfDayLabel'
				).innerText = `Time Of Day: Night`;
				changeDaylight('night');
				break;
			}
			default: {
				break;
			}
		}
	});
	// settingsResolutionSlider.addEventListener("change", (event) => {
	// 	document.getElementById("ResolutionSliderLabel").innerText = `Resolution: ${settingsResolutionSlider.value}x`
	// 	renderer.setPixelRatio(window.devicePixelRatio * settingsResolutionSlider.value)
	// 	renderer.render(scene, camera)
	// })
	// addBookMenu.addEventListener("keypress", (event) => {
	// 	console.log("keypressed")
	// 	if (event.key === "Escape") {
	// 		console.log("Escape pressed")
	// 		controls.lock()
	// 		addBookMenu.style.display = "none"
	// 	}
	// })

	controls.addEventListener('lock', function () {
		if (moveToCamera[0] === false) {
			pauseMenu.style.display = 'none';
		} else {
			informationScreen.style.display = 'none';
		}
	});

	controls.addEventListener('unlock', function () {
		if (
			window.getComputedStyle(addBookMenu, null).display === 'none' &&
			window.getComputedStyle(informationScreen, null).display ===
				'none' &&
			window.getComputedStyle(loadingScreen, null).display === 'none' &&
			moveToCamera[0] === false
		) {
			pauseMenu.style.display = 'block';
		}
	});

	controls.addEventListener('change', function () {
		socket.emit(
			'move',
			[camera.position.x, camera.position.y, camera.position.z],
			[
				camera.quaternion.x,
				camera.quaternion.y,
				camera.quaternion.z,
				camera.quaternion.w,
			]
		);
	});

	window.addEventListener(
		'beforeunload',
		function (e) {
			controls.unlock();
			e.preventDefault();
			console.log('unloading');
			socket.emit('disconnect');
			return null;
		},
		{ capture: true }
	);

	document.addEventListener('visibilitychange', (event) => {
		if (document.visibilityState === 'visible') {
			controls.lock();
		} else {
			controls.unlock();
		}
	});

	const keyDownEventListener = (event) => {
		switch (event.key) {
			case 'w':
				moveForward = true;
				break;
			case 'a':
				moveLeft = true;
				break;
			case 's':
				moveBackward = true;
				break;
			case 'd':
				moveRight = true;
				break;
		}
	};

	const keyUpEventListener = (event) => {
		switch (event.key) {
			case 'w':
				moveForward = false;
				break;
			case 'a':
				moveLeft = false;
				break;
			case 's':
				moveBackward = false;
				break;
			case 'd':
				moveRight = false;
				break;
		}
	};

	document.addEventListener('keydown', keyDownEventListener);
	document.addEventListener('keyup', keyUpEventListener);

	document.addEventListener('mousedown', (event) => {
		camera.updateProjectionMatrix();
		raycaster.setFromCamera(center, camera);

		const clickableObjects = raycasterObjects;
		if (controls.isLocked === true) {
			let intersections = raycaster.intersectObjects(clickableObjects);
			let specificIntersection =
				intersections.length > 0 ? intersections[0] : null;
			if (specificIntersection && INTERSECTED === true) {
				if (specificIntersection.object.userData.type === 'Book') {
					moveToCamera[0] = true;
				} else if (
					specificIntersection.object.userData.type === 'player'
				) {
					console.log(
						'You cannot click on players yet. Hopefully coming soon!...'
					);
				} else {
					controls.unlock();
					addBookMenu.style.display = 'block';
				}
			}
		}
	});

	scene.add(controls.getObject());

	const crosshairGeometry = new THREE.CircleGeometry(1, 60);
	const crosshairMaterial = new THREE.MeshBasicMaterial({
		color: 0xf0f0f0,
		side: THREE.DoubleSide,
	});
	const crosshair = new THREE.Mesh(crosshairGeometry, crosshairMaterial);
	crosshair.position.z = 5;
	camera.add(crosshair);
	crosshair.position.set(0, 0, -1);
	crosshair.scale.set(0.01, 0.01, 0.01);

	const geometry = new THREE.BoxGeometry(1, 1, 1);
	//const material = new THREE.MeshBasicMaterial({color: 0xf0f0f0})
	const cubeBase = new THREE.TextureLoader().load(
		'../3DModels/cube/chatka_fundamenty_baseColor.png'
	);
	const cubeRoughness = new THREE.TextureLoader().load(
		'../3DModels/cube/chatka_fundamenty_metallicRoughness.png'
	);
	const cubeNormal = new THREE.TextureLoader().load(
		'../3DModels/cube/chatka_fundamenty_normal.png'
	);
	const material = new THREE.MeshStandardMaterial({
		map: cubeBase,
		normalMap: cubeNormal,
		roughnessMap: cubeRoughness,
	});
	cube = new THREE.Mesh(geometry, material);
	cube.position.y = 2;
	cube.castShadow = true;
	cube.receiveShadow = true;
	cube.geometry.computeBoundingBox();
	cube.geometry.computeBoundingSphere();

	raycasterObjects.push(cube);

	cube.userData = {
		type: 'AddingBook',
	};
	scene.add(cube);

	loader.load(
		'../3DModels/library-center/library_earthquake.glb',
		function (gltf) {
			gltf.scene.scale.set(0.25, 0.25, 0.25);
			gltf.scene.position.set(0, -0.031, 0);
			gltf.scene.rotation.set(0, -90, 0);
			gltf.scene.recieveShadow = true;
			gltf.scene.castShadow = true;
			scene.add(gltf.scene);
			raycasterObjects.push(gltf.scene);
		},
		function (xhr) {},
		function (error) {}
	);
	// loader.load('../3DModels/playerModel/scene.gltf', function (gltf) {
	// 	const playerModel = gltf.scenes[0];
	// 	console.log('loading player');
	// });

	bookBand = 0;
	buildBooks();

	light = new THREE.HemisphereLight(0xffe6d3);
	light.intensity = 0.7;
	scene.add(light);

	const directionalLight = new THREE.DirectionalLight(0xffffff);
	directionalLight.power = 0.5;
	//scene.add(directionalLight)
	//scene.add(directionalLight.target)
	directionalLight.target.position.set(0.5, 0.5, 0.5);

	const planegeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
	const floorTextureBase = new THREE.TextureLoader().load(
		'../3DModels/floor/textures/floor_texture_baseColor.png'
	);
	floorTextureBase.wrapS = THREE.RepeatWrapping;
	floorTextureBase.wrapT = THREE.RepeatWrapping;
	const floorTextureRoughness = new THREE.TextureLoader().load(
		'../3DModels/floor/textures/floor_texture_metallicRoughness.png'
	);
	floorTextureRoughness.wrapS = THREE.RepeatWrapping;
	floorTextureRoughness.wrapT = THREE.RepeatWrapping;
	const floorTextureNormal = new THREE.TextureLoader().load(
		'../3DModels/floor/textures/floor_texture_normal.png'
	);
	floorTextureNormal.wrapS = THREE.RepeatWrapping;
	floorTextureNormal.wrapT = THREE.RepeatWrapping;

	const repetitionVal = 400;
	floorTextureBase.repeat.set(repetitionVal, repetitionVal, repetitionVal);
	floorTextureNormal.repeat.set(repetitionVal, repetitionVal, repetitionVal);
	floorTextureRoughness.repeat.set(
		repetitionVal,
		repetitionVal,
		repetitionVal
	);

	const planematerial = new THREE.MeshStandardMaterial({
		color: 0xf0f0f0,
		map: floorTextureBase,
		normalMap: floorTextureNormal,
		roughness: floorTextureRoughness,
	});
	const plane = new THREE.Mesh(planegeometry, planematerial);
	plane.position.y = 0.0;
	plane.rotation.x -= Math.PI / 2;
	scene.add(plane);

	//excludedObjects.push(camera, light, plane, crosshair)

	camera.position.z = 5;

	setSky();

	raycaster = new THREE.Raycaster();

	window.addEventListener('resize', onWindowResize);

	checkTimeOfDay();
}

function buildBooks() {
	fetch(`${URL}/books`, {
		method: 'GET',
	})
		.then((res) => res.json())
		.then((data) => {
			constructBooks(data, false);
		})
		.catch((error) => console.log(error));
}

export function deleteBookWithID(id) {
	fetch(`${URL}/delete/${id}`, {
		method: 'GET',
	})
		.then((res) => res.json())
		.then((data) => {
			console.log(data);
			document.getElementById('hiddenBookId').value = '';
		});
	for (child in scene.children) {
		console.log(scene.children);

		// controls.lock();
		// socket.emit('currentlyReading', '');
		// informationScreen.style.display = 'none';
		// moveToCamera[1] = 'toward';
		// moveToCamera[0] = false;
		// moveToCamera = moveToCamera.slice(0, 2);
	}
}

export function constructBooks(data, fromDBQuery) {
	if (fromDBQuery) {
		startingLoad = false;
	}
	loader.load(
		'../3DModels/book/book.glb',
		function (gltf) {
			const bookObject = gltf.scene.children[0].children[0].children[0];
			constructBooksLogic(data, fromDBQuery, bookObject);
		},
		undefined,
		function (error) {
			console.error(error);
		}
	);
}

function constructBooksLogic(data, fromDBQuery, bookObject) {
	if (fromDBQuery) {
		controls.lock();
	}
	for (let i = 0; i < data.length; i++) {
		const newObject = bookObject.clone();
		newObject.scale.set(0.0025, 0.0025, 0.0025);

		let posX, posY, posZ, rotX, rotY, rotZ;
		posX = data[i].position.x;
		posY = data[i].position.y;
		posZ = data[i].position.z;
		rotX = data[i].rotation.x;
		rotY = data[i].rotation.y;
		rotZ = data[i].rotation.z;

		newObject.position.x = posX;
		newObject.position.y = posY;
		newObject.position.z = posZ;
		newObject.userData = {
			type: 'Book',
			bookData: {
				id: data[i]._id,
				title: data[i].title,
			},
		};

		if (fromDBQuery) {
			const sound = new THREE.PositionalAudio(theAudioListener);

			// load a sound and set it as the Audio object's buffer
			const audioLoader = new THREE.AudioLoader();
			audioLoader.load('../sounds/newBook.wav', function (buffer) {
				sound.setBuffer(buffer);
				sound.setLoop(true);
				sound.setVolume(0.5);
				sound.setRefDistance(1);
				sound.setLoopStart(2);
				sound.setLoopEnd(7);
				sound.setRolloffFactor(1);
				sound.setMaxDistance(5);
				sound.play();
				setTimeout(() => {
					sound.stop();
				}, 30000);
			});

			newObject.add(sound);
		}

		newObject.rotation.set(rotX, rotY, rotZ);
		scene.add(newObject);
		raycasterObjects.push(newObject);
	}

	console.log(scene.children);

	if (startingLoad) {
		clearInterval(loadingInterval);
		loadedButton.style.display = 'block';
		loadingBarContainer.style.display = 'none';
		loadingString.innerText = 'Ready To Go!';
		animate();
	}
}

function renderObjects() {
	const frustum = new THREE.Frustum();
	const matrix = new THREE.Matrix4().multiplyMatrices(
		camera.projectionMatrix,
		camera.matrixWorldInverse
	);
	frustum.setFromProjectionMatrix(matrix);
	for (let obj of scene.children) {
		if (
			frustum.containsPoint(obj.position) &&
			obj.userData.type === 'Book'
		) {
			obj.visible = true;
		} else if (
			!frustum.containsPoint(obj.position) &&
			obj.userData.type === 'Book'
		) {
			obj.visible = false;
		}
	}
}

function displayInformationFetch(id) {
	fetch(`${URL}/books/${id}`)
		.then((res) => res.json())
		.then((data) => displayInformation(data));
}

function displayInformation(data) {
	socket.emit('currentlyReading', data.title);
	const title = document.getElementsByClassName('InformationTitle')[0];
	const author = document.getElementsByClassName('InformationAuthor')[0];
	const genre = document.getElementsByClassName('InformationGenre')[0];
	const description = document.getElementsByClassName(
		'InformationDescription'
	)[0];
	const hiddenID = document.getElementById('hiddenBookId');

	title.innerHTML = data.title;
	author.innerHTML = data.author;
	genre.innerHTML = data.genre;
	description.innerHTML = data.description;
	hiddenID.value = data.id;
}

function moveBookToCamera(delta, object) {
	if (moveToCamera[1] === 'toward') {
		permanentText.style.visibility = 'hidden';
		const distanceFromCamera = 3; // 3 units
		const target = new THREE.Vector3(0, 0, -distanceFromCamera);
		target.applyMatrix4(camera.matrixWorld);

		const cameraRotation = camera.getWorldQuaternion(
			new THREE.Quaternion()
		);

		const moveSpeed = 30; // units per second
		const distance = object.position.distanceTo(target);
		if (distance > 0.01) {
			const amount = Math.min(moveSpeed * delta, distance) / distance;
			object.position.lerp(target, amount);
			//object.lookAt(camera.position);
			object.quaternion.slerp(cameraRotation, amount);
			//object.material.color.set('green');
		} else {
			controls.unlock();
			informationScreen.style.display = 'block';
			displayInformationFetch(object.userData.bookData.id);
			moveToCamera[1] = 'away';
			moveToCamera[0] = false;
			//cube.material.color.set('red');
		}
	} else if (moveToCamera[1] === 'away') {
		permanentText.style.visibility = 'visible';
		const movementTarget = moveToCamera[2];
		const rotationTarget = moveToCamera[3];
		//const rotationTarget = moveToCamera[3]
		const moveSpeed = 45; // units per second
		const distance = object.position.distanceTo(movementTarget);
		if (distance > 0) {
			//controls.unlock()
			const amount = Math.min(moveSpeed * delta, distance) / distance;
			object.quaternion.slerp(rotationTarget, amount);
			object.position.lerp(movementTarget, amount);
			//object.rotation.lerp(rotationTarget, amount)
			//object.material.color.set('green');
		} else {
			controls.lock();
			socket.emit('currentlyReading', '');
			informationScreen.style.display = 'none';
			document.getElementById('hiddenBookId').value = '';
			moveToCamera[1] = 'toward';
			moveToCamera[0] = false;
			moveToCamera = moveToCamera.slice(0, 2);
			//cube.material.color.set('red');
		}
	}
}

function animate() {
	requestAnimationFrame(animate);

	//console.log(moveToCamera[0])
	cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;

	camera.updateProjectionMatrix();
	raycaster.setFromCamera(center, camera);

	time = performance.now();

	const delta = (time - previousTime) / 1000;

	// if(globalTimeOfDay === "night") {
	// 	console.log("night")
	// 	//flashlight.quaternion.slerp(camera.getWorldQuaternion(new THREE.Quaternion()), delta)
	// }

	//renderObjects()
	//moveSun()
	if (controls.isLocked === true) {
		let intersections = raycaster.intersectObjects(raycasterObjects);
		let specificIntersection =
			intersections.length > 0 ? intersections[0] : null;
		if (
			specificIntersection &&
			specificIntersection.object.userData.name !== 'defaultMaterial' &&
			specificIntersection.distance < 5
		) {
			if (INTERSECTED === false) {
				if (specificIntersection.object.userData.type === 'Book') {
					INTERSECTED = true;
					permanentText.classList.add('fadeIn');
					permanentText.value =
						specificIntersection.object.userData.bookData.title;
				} else if (
					specificIntersection.object.userData.type === 'AddingBook'
				) {
					INTERSECTED = true;
					let geo = new THREE.EdgesGeometry(
						specificIntersection.object.geometry
					);
					let mat = new THREE.LineBasicMaterial({
						color: 'white',
						linewidth: 40,
					});
					let wireframe = new THREE.LineSegments(geo, mat);
					wireframe.renderOrder = 1; // make sure wireframes are rendered 2nd
					specificIntersection.object.add(wireframe);
					specificIntersection.object.userData = {
						type: 'AddingBook',
					};
					permanentText.classList.add('fadeIn');
					permanentText.value = 'Add A Book';
					renderer.render(scene, camera);
				} else if (
					specificIntersection.object.userData.type === 'player'
				) {
					INTERSECTED = true;
					permanentText.classList.add('fadeIn');
					if (
						clients[specificIntersection.object.userData.id]
							.currentlyReading !== ''
					) {
						permanentText.value =
							clients[specificIntersection.object.userData.id]
								.name +
							' is currently reading: ' +
							clients[specificIntersection.object.userData.id]
								.currentlyReading;
					} else {
						permanentText.value =
							clients[
								specificIntersection.object.userData.id
							].name;
					}
				}
			} else {
				if (specificIntersection.object.userData.type === 'Book') {
					if (moveToCamera[0] === true) {
						if (moveToCamera.length === 2) {
							const pos =
								specificIntersection.object.getWorldPosition(
									new THREE.Vector3()
								);
							const rot =
								specificIntersection.object.getWorldQuaternion(
									new THREE.Quaternion()
								);
							permanentText.style.visibility = 'visible';
							moveToCamera.push(pos, rot);
						}
						moveBookToCamera(delta, specificIntersection.object);
					}
				}
			}
		} else {
			if (INTERSECTED) {
				INTERSECTED = false;
				permanentText.value = '';
				permanentText.classList.remove('fadeIn');
				scene.children[1].children = [];
				renderer.render(scene, camera);
			}
		}

		velocity.x -= velocity.x * 10.0 * delta;
		velocity.z -= velocity.z * 10.0 * delta;

		direction.z = Number(moveForward) - Number(moveBackward);
		direction.x = Number(moveRight) - Number(moveLeft);
		direction.normalize();

		if (moveForward || moveBackward) {
			velocity.z -= direction.z * 750.0 * delta;
			socket.emit(
				'move',
				[camera.position.x, camera.position.y, camera.position.z],
				[
					camera.quaternion.x,
					camera.quaternion.y,
					camera.quaternion.z,
					camera.quaternion.w,
				]
			);
		}
		if (moveLeft || moveRight) {
			velocity.x -= direction.x * 750.0 * delta;
			socket.emit(
				'move',
				[camera.position.x, camera.position.y, camera.position.z],
				[
					camera.quaternion.x,
					camera.quaternion.y,
					camera.quaternion.z,
					camera.quaternion.w,
				]
			);
		}

		if (clients) controls.moveRight(-velocity.x * delta);
		controls.moveForward(-velocity.z * delta);
	}
	previousTime = time;

	renderer.render(scene, camera);
}

function checkTimeOfDay() {
	const now = new Date();
	const rightNow = now.getHours();
	if (rightNow < 16 && rightNow > 5) {
		changeDaylight('daylight');
	} else if (rightNow >= 16 && rightNow <= 20) {
		changeDaylight('evening');
	} else {
		changeDaylight('night');
	}
}

function setSky() {
	sky = new Sky();
	sky.scale.setScalar(450000);
	scene.add(sky);

	excludedObjects.push(sky);

	sun = new THREE.Vector3();

	const uniforms = sky.material.uniforms;
	uniforms['turbidity'].value = 10;
	uniforms['rayleigh'].value = 3;
	uniforms['mieCoefficient'].value = 0.005;
	uniforms['mieDirectionalG'].value = 0.7;

	const phi = THREE.MathUtils.degToRad(90 - 0.3);
	const theta = THREE.MathUtils.degToRad(180);

	sun.setFromSphericalCoords(1, phi, theta);

	uniforms['sunPosition'].value.copy(sun);
}

function changeDaylight(timeOfDay) {
	const uniforms = sky.material.uniforms;
	let elevation;
	globalTimeOfDay = timeOfDay;
	switch (timeOfDay) {
		case 'daylight':
			uniforms['turbidity'].value = 0.6;
			uniforms['rayleigh'].value = 0.5;
			uniforms['mieCoefficient'].value = 0.09;
			uniforms['mieDirectionalG'].value = 0.97;
			elevation = 40;
			renderer.toneMappingExposure = 0.75;
			light.intensity = 1;
			camera.remove(flashlight);
			break;
		case 'evening':
			uniforms['turbidity'].value = 10;
			uniforms['rayleigh'].value = 3;
			uniforms['mieCoefficient'].value = 0.005;
			uniforms['mieDirectionalG'].value = 0.7;
			elevation = 0.3;
			light.intensity = 0.7;
			renderer.toneMappingExposure = 0.65;
			camera.remove(flashlight);
			break;
		case 'night':
			uniforms['mieDirectionalG'].value = 0.9999999;
			uniforms['turbidity'].value = 20;
			uniforms['rayleigh'].value = 0;
			uniforms['mieCoefficient'].value = 0.1;
			elevation = 30;
			light.intensity = 0.01;
			renderer.toneMappingExposure = 0.2;
			flashlight = new THREE.SpotLight(0xffffff, 1, 350);
			flashlight.position.set(0, 0, 6);
			flashlight.castShadow = true;
			flashlight.target = camera;
			if (camera.children.includes(flashlight)) {
				break;
			} else {
				camera.add(flashlight);
			}
			//camera.add(flashlight.target)
			// flashlight.position.set(0,0,1)
			// flashlight.lookAt(camera)
			break;
		default:
			break;
	}
	const phi = THREE.MathUtils.degToRad(90 - elevation);
	const theta = THREE.MathUtils.degToRad(180);

	sun.setFromSphericalCoords(1, phi, theta);

	uniforms['sunPosition'].value.copy(sun);

	renderer.render(scene, camera);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
