
utils.setup()
utils.setStyles()
utils.setGlobals()

var fov = 60
var camera = {pos: {x: 0, y: 0, z: 0}, rot: {x: 0, y: 0, z: 0}}

function getViewMatrix() {
    let view = mat4.create()
    let projection = mat4.create()
    mat4.perspective(projection, fov * Math.PI / 180, gpucanvas.width / gpucanvas.height, 0.01, 5000)

    mat4.translate(view, view, [-camera.pos.x, camera.pos.y, -camera.pos.z])
    mat4.rotateY(view, view, -camera.rot.y)
    mat4.rotateX(view, view, -camera.rot.x)
    mat4.rotateZ(view, view, -camera.rot.z)
    mat4.invert(view, view)

    return mat4.multiply(mat4.create(), projection, view)
}

function getModelMatrix(x, y, z, rotx, roty, rotz) {
    let model = mat4.create()

    mat4.translate(model, model, [x, y, -z])
    mat4.rotateY(model, model, -roty)
    mat4.rotateX(model, model, -rotx)
    mat4.rotateZ(model, model, -rotz)

    mat4.scale(model, model, [1, 1, -1])

    // mat4.invert(model, model)

    return model
}

webgpu.onReady = () => {requestAnimationFrame(frame)}

webgpu.setup()
webgpu.setStyles()

for (let x = 0; x < 10; x++) {
    for (let y = 0; y < 10; y++) {
        for (let z = 0; z < 10; z++) {
            var test = new webgpu.Mesh(x, y, z+3, 1, 1, 1, [
                0, 1, 0,
                0, 0, 0,
                1, 0, 0
            ],
            [
                0, 1, 2
            ])
        }
    }
}


var test2 = new webgpu.Mesh(-3, 0, 0, 1, 1, 1, [
    0, 1, 0,
    0, 0, 0,
    0, 0, 1
],
[
    0, 1, 2
])

test2.colours = [
    1, 0, 0, 1,
    0, 1, 0, 1,
    0, 0, 1, 1
]
test2.updateBuffers()

var coolBox = new webgpu.Box(0, 0, -3, 1, 1, 1, [0, 0.5, 1])

var ground = new webgpu.Mesh(0, -0.5, 0, 1, 1, 1, [
    -10, 0, -10,
    10, 0, 10,
    -10, 0, 10,
    10, 0, -10
],
[
    0, 3, 1,
    2, 1, 0
])
ground.colours = [
    0, 0.5, 0, 1,
    0, 1, 0, 1,
    0, 0.75, 0, 1,
    0, 0.65, 0, 1
]


var delta = 0
var lastTime = 0
var su = 0

var time = 0

var speed = 3

var viewProjection

function frame(timestamp) {

    utils.getDelta(timestamp)
    ui.resizeCanvas()
    ui.getSu()
    input.setGlobals()

    time += delta

    gpucanvas.width = window.innerWidth
    gpucanvas.height = window.innerHeight

    if (keys["KeyW"]) {
        camera.pos.x -= Math.sin(camera.rot.y)*speed*delta
        camera.pos.z += Math.cos(camera.rot.y)*speed*delta
    }
    if (keys["KeyS"]) {
        camera.pos.x += Math.sin(camera.rot.y)*speed*delta
        camera.pos.z -= Math.cos(camera.rot.y)*speed*delta
    }
    if (keys["KeyA"]) {
        camera.pos.x += Math.cos(camera.rot.y)*speed*delta
        camera.pos.z += Math.sin(camera.rot.y)*speed*delta
    }
    if (keys["KeyD"]) {
        camera.pos.x -= Math.cos(camera.rot.y)*speed*delta
        camera.pos.z -= Math.sin(camera.rot.y)*speed*delta
    }
    if (keys["Space"]) {
        camera.pos.y += speed*delta
    }
    if (keys["ShiftLeft"]) {
        camera.pos.y -= speed*delta
    }

    if (mouse.lclick) {
        input.lockMouse()
    }

    viewProjection = getViewMatrix()
    
    test2.rot.y = time

    device.queue.writeBuffer(webgpu.uniforms.view[0], 0, viewProjection, 0, viewProjection.length)

    webgpu.render([0.4, 0.8, 1, 1])

    input.updateInput()

    requestAnimationFrame(frame)
}

var sensitivity = 0.002

input.mouseMove = (event) => {
    input.mouse.x = event.clientX/ui.scale
    input.mouse.y = event.clientY/ui.scale

    if (input.isMouseLocked()) {
        camera.rot.x += event.movementY*sensitivity
		if (camera.rot.x > Math.PI/2*0.99) {
			camera.rot.x = Math.PI/2*0.99
		}
		if (camera.rot.x < -Math.PI/2*0.99) {
			camera.rot.x = -Math.PI/2*0.99
		}

        camera.rot.y += event.movementX * sensitivity
    }
}