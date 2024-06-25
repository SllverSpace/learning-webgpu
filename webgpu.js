
class WebGPU {
    meshes = []
    shaders = `
        struct ViewUniforms {
            view: mat4x4<f32>
        }

        struct ModelUniforms {
            model: mat4x4<f32>
        }

        @group(0) @binding(0) var<uniform> viewUniforms: ViewUniforms;
        @group(0) @binding(1) var<uniform> modelUniforms: ModelUniforms;

        struct VertexOut {
        @builtin(position) position : vec4f,
        @location(0) color : vec4f
        }

        @vertex
        fn vertex_main(@location(0) position: vec4f,
                    @location(1) color: vec4f) -> VertexOut
        {
            var output : VertexOut;
            output.position = viewUniforms.view * modelUniforms.model * vec4<f32>(position.xyz, 1.0);
            output.color = color;
            return output;
        }

        @fragment
        fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
        {
            
            return fragData.color;
        }
    `
    uniforms = {
        view: [null, 0, 16*4, 0, true],
        model: [null, 1, 16*4, 0, false]
    }
    vertexConfig = {
        entryPoint: "vertex_main",
        buffers: [
            {
                arrayStride: 7 * 4,
                attributes: [
                    {
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x3"
                    },
                    {
                        shaderLocation: 1,
                        offset: 4 * 3,
                        format: "float32x4"
                    }
                ]
            }
        ]
    }
    fragmentConfig = {
        entryPoint: "fragment_main",
    }
    meshes = []
    ready = false
    async setup(id="gpucanvas") {
        window.gpucanvas = document.getElementById(id)
        
        if (!navigator.gpu) {
            throw Error("WebGPU not supported.")
        }

        this.adapter = await navigator.gpu.requestAdapter()
        if (!this.adapter) {
            throw Error('Couldn\'t request WebGPU adapter.')
        }
    
        window.device = await this.adapter.requestDevice()
    
        this.shaderModule = device.createShaderModule({
            code: this.shaders
        })

        window.gpuctx = gpucanvas.getContext("webgpu")
        
        gpuctx.configure({
            device: device,
            format: navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: "premultiplied"
        })

        var layout = {entries: []}

        for (let name in this.uniforms) {
            if (this.uniforms[name][4]) {
                this.uniforms[name][0] = device.createBuffer({
                    size: this.uniforms[name][2],
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                })
            }
            layout.entries.push({
                binding: this.uniforms[name][1],
                visibility: this.uniforms[name][3] == 0 ? GPUShaderStage.VERTEX : GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform" }
            })
        }

        this.bindGroupLayout = device.createBindGroupLayout(layout)

        for (let mesh of this.meshes) {
            mesh.createBindGroup(this.bindGroupLayout)
        }

        this.pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [this.bindGroupLayout]
        })

        var pipelineFormat = {
            layout: this.pipelineLayout, 
            primitive: {
                topology: "triangle-list",
            },
            vertex: {
                module: this.shaderModule,
                ...this.vertexConfig
            },
            fragment: {
                module: this.shaderModule,
                ...this.fragmentConfig,
                targets: [
                    {format: navigator.gpu.getPreferredCanvasFormat()}
                ]
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus",
            },
        }

        this.pipeline = device.createRenderPipeline(pipelineFormat)

        for (let mesh of this.meshes) {
            mesh.updateBuffers()
        }

        this.ready = true
        this.onReady()
    }
    setStyles() {
        gpucanvas.style.position = "absolute"
        gpucanvas.style.left = 0
        gpucanvas.style.top = 0
        document.body.style.overflow = "hidden"
    }
    onReady() {

    }
    render(background=[0, 0, 0, 1]) {
        var commandEncoder = device.createCommandEncoder()

        var depthTexture = device.createTexture({
            size: [gpucanvas.width, gpucanvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        })

        var renderPassDescriptor = {
        colorAttachments: [{
            clearValue: {r: background[0], g: background[1], b: background[2], a: background[3]},
            loadOp: 'clear',
            storeOp: 'store',
            view: gpuctx.getCurrentTexture().createView()
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
        }
    
        var passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
        
        passEncoder.setPipeline(this.pipeline)

        for (let mesh of this.meshes) {
            mesh.render(passEncoder)
        }

        passEncoder.end()
  
        device.queue.submit([commandEncoder.finish()])
    }
    get Mesh() {
        return class {
            uniformsB = {}
            constructor(x, y, z, width, height, depth, vertices, faces) {
                this.pos = {x: x, y: y, z: z}
                this.size = {x: width, y: height, z: depth}
                this.rot = {x: 0, y: 0, z: 0}
                this.vertices = vertices
                this.colours = []
                this.faces = faces
                this.shaders = webgpu.shaders
                this.uniforms = webgpu.uniforms
                webgpu.meshes.push(this)
                if (webgpu.ready) {
                    this.createBindGroup(webgpu.bindGroupLayout)
                    this.updateBuffers()
                }
            }
            createBindGroup(layout) {
                let bLayout = {layout: layout, entries: []}
                
                for (let name in webgpu.uniforms) {
                    if (!webgpu.uniforms[name][4]) {
                        this.uniformsB[name] = device.createBuffer({
                            size: webgpu.uniforms[name][2],
                            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                        })
                    }
                }

                for (let name in this.uniforms) {
                    bLayout.entries.push({
                        binding: this.uniforms[name][1],
                        resource: {
                            buffer: this.uniforms[name][4] ? this.uniforms[name][0] : this.uniformsB[name]
                        }
                    })
                }

                this.bindGroup = device.createBindGroup(bLayout)
            }
            updateBuffers() {
                if (!window.device) return
                let vertexes = []
                for (let i = 0; i < this.vertices.length/3; i++) {
                    vertexes.push(this.vertices[i*3], this.vertices[i*3+1], this.vertices[i*3+2], this.colours[i*4], this.colours[i*4+1], this.colours[i*4+2], this.colours[i*4+3])
                }
                vertexes = new Float32Array(vertexes)
                let indexes = new Uint32Array(this.faces)

                this.vertexBuffer = device.createBuffer({
                    size: vertexes.byteLength,
                    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                })
                device.queue.writeBuffer(this.vertexBuffer, 0, vertexes, 0, vertexes.length)

                this.indexBuffer = device.createBuffer({
                    size: indexes.byteLength,
                    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
                })
                device.queue.writeBuffer(this.indexBuffer, 0, indexes, 0, indexes.length)
            }
            render(passEncoder) {
                passEncoder.setVertexBuffer(0, this.vertexBuffer)
                passEncoder.setIndexBuffer(this.indexBuffer, "uint32")
                
                let modelMatrix = getModelMatrix(this.pos.x, this.pos.y, this.pos.z, this.rot.x, this.rot.y, this.rot.z)

                device.queue.writeBuffer(this.uniformsB.model, 0, modelMatrix, 0, modelMatrix.length)

                passEncoder.setBindGroup(0, this.bindGroup)
            
                passEncoder.drawIndexed(this.faces.length, 1, 0, 0, 0)
            }
        }
    }

    get Box() {
		return class extends webgpu.Mesh {
			lastColour = []
			colour = [0, 0, 0]
			visible = true
			shading = true
			constructor(x, y, z, width, height, depth, colour, centerRot=true) {
				super(x, y, z, width, height, depth, [],[
					// +Z
					18, 17, 16,
					16, 17, 19,
					// -X
					6, 5, 4,
					4, 5, 7,
					// +X
					0, 1, 2,
					3, 1, 0,
					// -Z
					20, 21, 22,
					23, 21, 20,
					// -Y
					12, 13, 14,
					15, 13, 12,
					// +Y
					10, 9, 8,
					8, 9, 11,
				])
				this.oneSide = true
				this.colour = colour
				if (centerRot) {
					this.rotOff = {x: -width/2, y: -height/2, z: -depth/2}
				}
                this.updateShape()
			}
            setUvs(offx=0, offy=0, offw=1, offh=1) {
                this.uvs = []
                for (let i = 0; i < 6; i++) {
                    this.uvs.push(
                        offx+offw, offy+offh,
                        0, 0,
                        0, offy+offh,
                        offx+offw, 0,
                    )
                }
                this.updateBuffers()
            }
			updateShape(o=0) {
				this.vertices = [
					// +X
					1-o, 1, 1,
					1-o, 0, 0,
					1-o, 1, 0,
					1-o, 0, 1,
					// -X
					0+o, 1, 1,
					0+o, 0, 0,
					0+o, 1, 0,
					0+o, 0, 1,
					// +Y
					1, 1-o, 1,
					0, 1-o, 0,
					1, 1-o, 0,
					0, 1-o, 1,
					// -Y
					1, 0+o, 1,
					0, 0+o, 0,
					1, 0+o, 0,
					0, 0+o, 1,
					// +Z
					1, 1, 0+o,
					0, 0, 0+o,
					1, 0, 0+o,
					0, 1, 0+o,
					// -Z
					1, 1, 1-o,
					0, 0, 1-o,
					1, 0, 1-o,
					0, 1, 1-o,
				]
                this.updateBuffers()
			}
			render(passEncoder) {
				if (!this.visible) { return }
				if (JSON.stringify(this.colour) != JSON.stringify(this.lastColour)) {
					this.colours = []
					if (this.shading) {
						// +X
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*0.85, this.colour[1]*0.85, this.colour[2]*0.85, 1)
						}
						// -X
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*0.7, this.colour[1]*0.7, this.colour[2]*0.7, 1)
						}
						// +Y
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*1, this.colour[1]*1, this.colour[2]*1, 1)
						}
						// -Y
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*0.55, this.colour[1]*0.55, this.colour[2]*0.55, 1)
						}
						// +Z
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*0.75, this.colour[1]*0.75, this.colour[2]*0.75, 1)
						}
						// -Z
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*0.6, this.colour[1]*0.6, this.colour[2]*0.6, 1)
						}
					} else {
						for (let i = 0; i < 4*6; i++) {
							this.colours.push(this.colour[0]*1, this.colour[1]*1, this.colour[2]*1, 1)
						}
					}
					
					this.updateBuffers()
				}
				this.lastColour = [...this.colour]
				this.pos.x -= this.size.x/2
				this.pos.y -= this.size.y/2
				this.pos.z -= this.size.z/2
				super.render(passEncoder)
				this.pos.x += this.size.x/2
				this.pos.y += this.size.y/2
				this.pos.z += this.size.z/2
			}
		}
	}
}

var webgpu = new WebGPU()