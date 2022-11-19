import * as THREE from "three"
import { PointerLockControls } from '../jsm/controls/PointerLockControls.js';
import { GLTFLoader } from '../jsm/loaders/GLTFLoader.js';
import { FontLoader } from "../jsm/loaders/FontLoader.js";
//import {TextGeometry} from "../jsm/geometries/TextGeometry.js"
import {Sky} from "../jsm/objects/Sky.js"
import { Vector3 } from "three";

//import { DragControls } from './jsm/controls/DragControls.js'

let scene, renderer, camera, controls, cube, raycaster, textObject;
let INTERSECTED = false;
let moveForward = false,
	moveBackward = false,
	moveLeft = false,
	moveRight = false;
let URL = "https://thylibrary-backend.onrender.com" //Change if running on local machine
let raycasterObjects = [], excludedObjects = [];
let time;
let bookBand;
let font;

let moveToCamera = [false, "toward"]

let sun, sky, sunRayleigh, sunElevation;
let previousTime = performance.now();

let startingLoad = true;

const center = new THREE.Vector2(0,0)
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const manager = new THREE.LoadingManager()
const fontLoader =  new FontLoader()
const loader = new GLTFLoader(manager);
const pauseMenu = document.getElementById("PausedMenu")
const addBookMenu = document.getElementById("AddBookMenu")
const dismissAddBookMenu = document.getElementById("DismissBookMenuButton")
const loadingScreen = document.getElementById("LoadingScreen")
const loadedButton = document.getElementsByClassName("LoadedButton")[0]
const loadingBar = document.getElementById("ProgressBar")
const loadingBarContainer = document.getElementById("ProgressBarContainer")
const loadingString = document.getElementsByClassName("LoadingLabel")[0]
const permanentText = document.getElementsByClassName("PermanentTextBox")[0]
const informationScreen = document.getElementById("InformationScreen")
//const fadeIn = document.querySelector(".fadeIn")
const wittyLoadingMessages = [
	"Assembling Poorly Built Code...",
	"Engaging In Wizardry...",
	"Building Stuff...",
	"Downloading More RAM...",
	"Feeding unicorns...",
	"TODO: Insert elevator music...",
	"Running with scissors...",
	"Reversing the shield polarity...",
]

window.addEventListener("onunload", function(e){
	console.log("unloading")
	controls.unlock()
}, false);

document.addEventListener("visibilitychange", function(e) {
	controls.unlock()
})

manager.onStart = function ( url, itemsLoaded, itemsTotal ) {
	if (startingLoad) {
		loadingScreen.style.display = "block"
		pauseMenu.style.display = "none"
		loadedButton.style.display = "none"
		loadingString.innerText = wittyLoadingMessages[Math.floor(Math.random() * wittyLoadingMessages.length)]
		console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
	}
};

manager.onLoad = function ( ) {
	if (startingLoad) {
		console.log("DONE")
		loadedButton.style.display = "block";
		loadingBarContainer.style.display = "none";
		loadingString.innerText = "Ready To Go!"
		animate()
	}
};


manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
	if (startingLoad) {
		const total = Math.floor(itemsLoaded/itemsTotal * 100)
		loadingBar.style.width = `${total}%`
		loadingBar.innerText = `${total}%`
		console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
	}
};

manager.onError = function ( url ) {
	console.log( 'There was an error loading ' + url );
};

function init() {

	scene = new THREE.Scene();

	fontLoader.load("../fonts/optimer_regular.typeface.json", function (response) {
		font = response
	})


	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.shadowMap.enabled = true;
	document.body.appendChild( renderer.domElement );

	camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 1, 500)
	camera.position.set(0, 1.5, -5);
	camera.scale.set(0.1, 0.1, 0.1)
	controls = new PointerLockControls(camera, renderer.domElement)
	controls.lock()

	loadedButton.addEventListener("click", (event) => {
		loadingScreen.style.display = "none";
		controls.lock()
	})

	dismissAddBookMenu.addEventListener("click", (event) => {
		addBookMenu.style.display = "none"
		controls.lock()
	})

	pauseMenu.addEventListener("click", (event) => {
		controls.lock()
	})

	informationScreen.addEventListener("click", (event) => {
		moveToCamera[0] = true;
		controls.lock()
	})
	// addBookMenu.addEventListener("keypress", (event) => {
	// 	console.log("keypressed")
	// 	if (event.key === "Escape") {
	// 		console.log("Escape pressed")
	// 		controls.lock()
	// 		addBookMenu.style.display = "none"
	// 	}
	// })

	controls.addEventListener( 'lock', function () {
		if (moveToCamera[0] === false) {
			pauseMenu.style.display = 'none';
		} else {
			informationScreen.style.display = "none"
		}
	} );

	controls.addEventListener('unlock', function () {
		if (window.getComputedStyle(addBookMenu, null).display === "none" && window.getComputedStyle(informationScreen, null).display === "none" && window.getComputedStyle(loadingScreen, null).display === "none" && moveToCamera[0] === false) {
			pauseMenu.style.display = 'block';
		}
	} );

	const keyDownEventListener = (event) => {
		switch (event.key) {
			case "w":
				moveForward = true
				break
			case "a":
				moveLeft = true
				break
			case "s":
				moveBackward = true
				break
			case "d":
				moveRight = true
				break
		}
	}

	const keyUpEventListener = (event) => {
		switch (event.key) {
			case "w":
				moveForward = false
				break
			case "a":
				moveLeft = false
				break
			case "s":
				moveBackward = false
				break
			case "d":
				moveRight = false
				break
		}
	}

	document.addEventListener("keydown", keyDownEventListener)
	document.addEventListener("keyup", keyUpEventListener)

	document.addEventListener("mousedown", (event) => {
		console.log("Mouse Down")

		camera.updateProjectionMatrix()
		raycaster.setFromCamera(center, camera);

		const clickableObjects = raycasterObjects
		if (controls.isLocked === true) {
			let intersections = raycaster.intersectObjects(clickableObjects)
			let specificIntersection = (intersections.length) > 0 ? intersections[0] : null;
			if (specificIntersection && INTERSECTED === true) {
				if (specificIntersection.object.userData.type === "Book") {
					moveToCamera[0] = true;
				} else {
					controls.unlock()
					addBookMenu.style.display = "block"
				}
			}
		}
	})

	scene.add(controls.getObject())

	const crosshairGeometry = new THREE.CircleGeometry(1,60)
	const crosshairMaterial = new THREE.MeshBasicMaterial({color: 0xf0f0f0, side: THREE.DoubleSide})
	const crosshair = new THREE.Mesh(crosshairGeometry, crosshairMaterial);
	crosshair.position.z = 5;
	camera.add(crosshair)
	crosshair.position.set(0,0,-1)
	crosshair.scale.set(0.01, 0.01, 0.01)

	const geometry = new THREE.BoxGeometry( 1, 1, 1 );
	const material = new THREE.MeshBasicMaterial( { color: 0x123456 , wireframe: false} );
	cube = new THREE.Mesh( geometry, material );
	cube.position.y = 2
	cube.castShadow = true
	cube.geometry.computeBoundingBox()
	cube.geometry.computeBoundingSphere()

	raycasterObjects.push(cube)

	cube.userData = {
		type: "AddingBook"
	}
	scene.add( cube );

	bookBand = 0;
	buildBooks()

	loader.load("../3DModels/library-center/library_earthquake.glb", function (gltf) {
		gltf.scene.scale.set(0.25, 0.25, 0.25)
		gltf.scene.position.set(0,-0.031,0)
		gltf.scene.rotation.set(0,-90,0)
		gltf.scene.recieveShadow = true
		scene.add(gltf.scene)
		raycasterObjects.push(gltf.scene)
	}, function ( xhr ) {
	}, function (error) {
	})




	const light = new THREE.HemisphereLight(0xFFE6D3)
	scene.add(light)

	const directionalLight = new THREE.DirectionalLight(0xffffff)
	light.power = 10;
	//scene.add(directionalLight)

	const planegeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1)
	const floorTextureBase = new THREE.TextureLoader().load("../3DModels/floor/textures/floor_texture_baseColor.png")
	floorTextureBase.wrapS = THREE.RepeatWrapping;
	floorTextureBase.wrapT = THREE.RepeatWrapping;
	const floorTextureRoughness = new THREE.TextureLoader().load("../3DModels/floor/textures/floor_texture_metallicRoughness.png")
	floorTextureRoughness.wrapS = THREE.RepeatWrapping;
	floorTextureRoughness.wrapT = THREE.RepeatWrapping;
	const floorTextureNormal = new THREE.TextureLoader().load("../3DModels/floor/textures/floor_texture_normal.png")
	floorTextureNormal.wrapS = THREE.RepeatWrapping;
	floorTextureNormal.wrapT = THREE.RepeatWrapping;


	const repetitionVal = 400;
	floorTextureBase.repeat.set(repetitionVal,repetitionVal,repetitionVal)
	floorTextureNormal.repeat.set(repetitionVal,repetitionVal,repetitionVal)
	floorTextureRoughness.repeat.set(repetitionVal,repetitionVal,repetitionVal)


	const planematerial = new THREE.MeshStandardMaterial( {
		color: 0xf0f0f0,
		map: floorTextureBase
	});
	const plane = new THREE.Mesh(planegeometry, planematerial)
	plane.position.y = 0.0
	plane.rotation.x -= Math.PI / 2
	scene.add(plane)

	//excludedObjects.push(camera, light, plane, crosshair)

	camera.position.z = 5;

	setSky();

	raycaster = new THREE.Raycaster();

	window.addEventListener("resize", onWindowResize)

}

function buildBooks() {
	fetch(`${URL}/books`, {
        method: "GET"
    })
	.then((res) => res.json())
	.then((data) => {
		console.log(data)
		constructBooks(data, false)
	}).catch((error) => console.log(error))
}

export function constructBooks(data, fromDBQuery) {
	if (fromDBQuery) {
		startingLoad = false;
	}de
	console.log("data", data)
	loader.load( '../3DModels/book/book.glb', function ( gltf ) {
		const bookObject = gltf.scene.children[0].children[0].children[0];
		console.log("bookObject", bookObject)

		constructBooksLogic(data, fromDBQuery, bookObject)
	}, undefined, function ( error ) {
		console.error( error );
	})
}

function constructBooksLogic(data, fromDBQuery, bookObject) {
	if (fromDBQuery) {
		controls.lock()
	}
	for (let i = 0; i < data.length; i++) {
		const newObject = bookObject.clone()
		console.log("newObject", newObject)
		newObject.scale.set(0.0025, 0.0025, 0.0025)

		let posX, posY, posZ, rotX, rotY, rotZ;
		console.log(data[i])
		posX = data[i].position.x
		posY = data[i].position.y
		posZ = data[i].position.z
		rotX = data[i].rotation.x
		rotY = data[i].rotation.y
		rotZ = data[i].rotation.z



		newObject.position.x = posX
		newObject.position.y = posY
		newObject.position.z = posZ
		newObject.userData = {
			type: "Book",
			bookData: {
				id: data[i]._id,
				title: data[i].title
			}
		}

		newObject.rotation.set(rotX, rotY, rotZ)
		scene.add(newObject);
		raycasterObjects.push(newObject)
	}
}

function renderObjects() {
	const frustum = new THREE.Frustum()
	const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
	frustum.setFromProjectionMatrix(matrix)
	for (let obj of scene.children) {
		if (frustum.containsPoint(obj.position) && obj.userData.type === "Book") {
			obj.visible = true
		} else if (!frustum.containsPoint(obj.position) && obj.userData.type === "Book") {
			obj.visible = false
		}
	}
}

function displayInformationFetch(id) {
	fetch(`${URL}/books/${id}`)
		.then((res) => res.json()).then((data) => displayInformation(data))
}

function displayInformation(data) {
	const title = document.getElementsByClassName("InformationTitle")[0]
	const author = document.getElementsByClassName("InformationAuthor")[0]
	const genre = document.getElementsByClassName("InformationGenre")[0]
	const description = document.getElementsByClassName("InformationDescription")[0]


	title.innerHTML = data.title;
	author.innerHTML = data.author;
	genre.innerHTML = data.genre;
	description.innerHTML = data.description
}

function moveBookToCamera(delta, object) {
	if (moveToCamera[1] === "toward") {
		permanentText.style.visibility = "hidden"
		const distanceFromCamera = 3;  // 3 units
		const target = new THREE.Vector3(0, 0, -distanceFromCamera);
		target.applyMatrix4(camera.matrixWorld);

		const cameraRotation = camera.getWorldQuaternion(new THREE.Quaternion());

		const moveSpeed = 30;  // units per second
		const distance = object.position.distanceTo(target);
		if (distance > 0.01) {
			const amount = Math.min(moveSpeed * delta, distance) / distance;
			object.position.lerp(target, amount);
			console.log(moveToCamera[2])
			//object.lookAt(camera.position);
			object.quaternion.slerp(cameraRotation, amount)
		//object.material.color.set('green');
		} else {
			controls.unlock()
			informationScreen.style.display = "block"
			displayInformationFetch(object.userData.bookData.id)
			moveToCamera[1] = "away"
			moveToCamera[0] = false
		//cube.material.color.set('red');
		}
	} else if (moveToCamera[1] === "away") {
		permanentText.style.visibility = "visible"
		const movementTarget = moveToCamera[2];
		const rotationTarget = moveToCamera[3]
		//const rotationTarget = moveToCamera[3]
		const moveSpeed = 45;  // units per second
		const distance = object.position.distanceTo(movementTarget);
		if (distance > 0) {
			//controls.unlock()
			const amount = Math.min(moveSpeed * delta, distance) / distance;
			object.quaternion.slerp(rotationTarget, amount)
			object.position.lerp(movementTarget, amount);
			//object.rotation.lerp(rotationTarget, amount)
		//object.material.color.set('green');
		} else {
			controls.lock()
			informationScreen.style.display = "none"
			moveToCamera[1] = "toward"
			moveToCamera[0] = false
			moveToCamera = moveToCamera.slice(0,2)
		//cube.material.color.set('red');
		}
	}

}

function animate() {
	requestAnimationFrame( animate );

	//console.log(moveToCamera[0])
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

	camera.updateProjectionMatrix()
	raycaster.setFromCamera(center, camera);

	time = performance.now()

	const delta = ( time - previousTime ) / 1000;

	//renderObjects()
	//moveSun()
	if (controls.isLocked === true) {
		let intersections = raycaster.intersectObjects(raycasterObjects)
		let specificIntersection = (intersections.length) > 0 ? intersections[0] : null;
		if (specificIntersection && specificIntersection.object.userData.name !== "defaultMaterial" && specificIntersection.distance < 5) {
			if (INTERSECTED === false) {
				console.log(specificIntersection)
				if (specificIntersection.object.userData.type === "Book") {
					INTERSECTED = true;
					permanentText.classList.add("fadeIn")
					permanentText.value = specificIntersection.object.userData.bookData.title;
				} else if (specificIntersection.object.userData.type === "AddingBook"){
					INTERSECTED = true;
					let geo = new THREE.EdgesGeometry(specificIntersection.object.geometry);
					let mat = new THREE.LineBasicMaterial({ color: "white", linewidth: 40 });
					let wireframe = new THREE.LineSegments(geo, mat);
					wireframe.renderOrder = 1; // make sure wireframes are rendered 2nd
					specificIntersection.object.add(wireframe);
					specificIntersection.object.userData = {type: "AddingBook"}
					permanentText.classList.add("fadeIn")
					permanentText.value = "Add A Book"
					renderer.render(scene, camera)
				}
			} else {
				if (specificIntersection.object.userData.type === "Book") {
					if (moveToCamera[0] === true) {
						if (moveToCamera.length === 2) {
							console.log("old position", specificIntersection.object.position)
							const pos = specificIntersection.object.getWorldPosition(new THREE.Vector3())
							const rot = specificIntersection.object.getWorldQuaternion(new THREE.Quaternion())
							permanentText.style.visibility = "visible";
							console.log(permanentText.style.visibility)
							moveToCamera.push(pos, rot)
							console.log("old position", moveToCamera[2])
						}
						moveBookToCamera(delta, specificIntersection.object)
					}
				}
			}
		} else {
			if (INTERSECTED) {
				INTERSECTED = false
				permanentText.value = ""
				permanentText.classList.remove("fadeIn")
				scene.children[1].children = []
				renderer.render(scene, camera)
			}
		}

		velocity.x -= velocity.x * 10.0 * delta;
		velocity.z -= velocity.z * 10.0 * delta;


		direction.z = Number( moveForward ) - Number( moveBackward );
		direction.x = Number( moveRight ) - Number( moveLeft );
		direction.normalize();

		if ( moveForward || moveBackward ) velocity.z -= direction.z * 750.0 * delta;
		if ( moveLeft || moveRight ) velocity.x -= direction.x * 750.0 * delta;

		controls.moveRight( - velocity.x * delta );
		controls.moveForward( - velocity.z * delta );
	}
	previousTime = time;

	renderer.render( scene, camera );

}

function setSky() {
	sky = new Sky();
	sky.scale.setScalar( 450000 );
	scene.add( sky );

	excludedObjects.push(sky)

	sun = new THREE.Vector3();
	sunElevation = 0.3;

	const uniforms = sky.material.uniforms;
	uniforms[ 'turbidity' ].value = 10;
	uniforms[ 'rayleigh' ].value = 3;
	uniforms[ 'mieCoefficient' ].value = 0.005;
	uniforms[ 'mieDirectionalG' ].value = 0.7;

	const phi = THREE.MathUtils.degToRad( 90 - sunElevation);
	const theta = THREE.MathUtils.degToRad( 180 );

	sun.setFromSphericalCoords( 1, phi, theta );

	uniforms[ 'sunPosition' ].value.copy( sun )
}

function moveSun() {
	if (Math.floor(time/1000) > Math.floor(previousTime/1000)) {

		sky.material.uniforms["rayleigh"].value -= 0.1
		sunElevation += 1
		const phi = THREE.MathUtils.degToRad( 90 - sunElevation);
		const theta = THREE.MathUtils.degToRad( 180 );

		sun.setFromSphericalCoords( 1, phi, theta )

		console.log(`Sun Moved, ${sun.object}`)
	}
}

function onWindowResize() {
	camera.aspect = window.innerWidth/ window.innerHeight
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}


init()
