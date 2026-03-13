import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeBackground() {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // ── Scene setup ────────────────────────────────────────────────────────
        const W = window.innerWidth;
        const H = window.innerHeight;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H);
        renderer.setClearColor(0x030712, 1);
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 1000);
        camera.position.z = 60;

        // ── Fog ────────────────────────────────────────────────────────────────
        scene.fog = new THREE.FogExp2(0x030712, 0.012);

        // ── Particles ──────────────────────────────────────────────────────────
        const PARTICLE_COUNT = 1800;
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const colors = new Float32Array(PARTICLE_COUNT * 3);
        const sizes = new Float32Array(PARTICLE_COUNT);
        const speeds = new Float32Array(PARTICLE_COUNT);

        const palette = [
            new THREE.Color(0x8b5cf6), // purple
            new THREE.Color(0x6366f1), // indigo
            new THREE.Color(0x22d3ee), // cyan
            new THREE.Color(0xec4899), // pink
            new THREE.Color(0xa78bfa), // light purple
        ];

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const r = 90;
            positions[i * 3] = (Math.random() - 0.5) * r * 2;
            positions[i * 3 + 1] = (Math.random() - 0.5) * r * 2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * r;

            const col = palette[Math.floor(Math.random() * palette.length)];
            colors[i * 3] = col.r;
            colors[i * 3 + 1] = col.g;
            colors[i * 3 + 2] = col.b;

            sizes[i] = Math.random() * 1.8 + 0.4;
            speeds[i] = Math.random() * 0.4 + 0.1;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

        // Circular sprite texture
        const canvas2d = document.createElement("canvas");
        canvas2d.width = 64;
        canvas2d.height = 64;
        const ctx = canvas2d.getContext("2d")!;
        const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, "rgba(255,255,255,1)");
        grd.addColorStop(0.4, "rgba(255,255,255,0.6)");
        grd.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 64, 64);
        const spriteTex = new THREE.CanvasTexture(canvas2d);

        const mat = new THREE.PointsMaterial({
            vertexColors: true,
            map: spriteTex,
            alphaTest: 0.01,
            transparent: true,
            sizeAttenuation: true,
            size: 1.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const points = new THREE.Points(geo, mat);
        scene.add(points);

        // ── Wireframe geometric mesh ───────────────────────────────────────────
        const torusGeo = new THREE.TorusKnotGeometry(18, 5, 160, 24, 2, 3);
        const torusMat = new THREE.MeshBasicMaterial({
            color: 0x4f46e5,
            wireframe: true,
            transparent: true,
            opacity: 0.12,
        });
        const torusMesh = new THREE.Mesh(torusGeo, torusMat);
        torusMesh.position.set(28, -8, -30);
        scene.add(torusMesh);

        const icoGeo = new THREE.IcosahedronGeometry(14, 1);
        const icoMat = new THREE.MeshBasicMaterial({
            color: 0x22d3ee,
            wireframe: true,
            transparent: true,
            opacity: 0.08,
        });
        const icoMesh = new THREE.Mesh(icoGeo, icoMat);
        icoMesh.position.set(-30, 12, -20);
        scene.add(icoMesh);

        // ── Mouse parallax ────────────────────────────────────────────────────
        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;

        const onMouseMove = (e: MouseEvent) => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener("mousemove", onMouseMove);

        // ── Animation loop ────────────────────────────────────────────────────
        let frameId: number;
        const clock = new THREE.Clock();

        const animate = () => {
            frameId = requestAnimationFrame(animate);
            const t = clock.getElapsedTime();

            // Smooth mouse follow
            targetX += (mouseX - targetX) * 0.04;
            targetY += (mouseY - targetY) * 0.04;

            // Drift particles
            const pos = geo.attributes.position.array as Float32Array;
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const speed = speeds[i];
                pos[i * 3 + 1] += Math.sin(t * speed + i) * 0.008;
                pos[i * 3] += Math.cos(t * speed * 0.7 + i) * 0.005;
                // Wrap particles that drift too far
                if (pos[i * 3 + 1] > 90) pos[i * 3 + 1] = -90;
                if (pos[i * 3 + 1] < -90) pos[i * 3 + 1] = 90;
            }
            geo.attributes.position.needsUpdate = true;

            // Mouse parallax on camera
            camera.position.x += (targetX * 8 - camera.position.x) * 0.05;
            camera.position.y += (-targetY * 4 - camera.position.y) * 0.05;
            camera.lookAt(scene.position);

            // Rotate meshes
            torusMesh.rotation.x = t * 0.08;
            torusMesh.rotation.y = t * 0.12;
            icoMesh.rotation.x = t * 0.10;
            icoMesh.rotation.y = t * 0.07;

            renderer.render(scene, camera);
        };
        animate();

        // ── Resize handler ─────────────────────────────────────────────────────
        const onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", onResize);

        // ── Cleanup ────────────────────────────────────────────────────────────
        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("resize", onResize);
            renderer.dispose();
            geo.dispose();
            mat.dispose();
            torusGeo.dispose();
            torusMat.dispose();
            icoGeo.dispose();
            icoMat.dispose();
            spriteTex.dispose();
            if (mount.contains(renderer.domElement)) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div
            ref={mountRef}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 0,
                pointerEvents: "none",
            }}
        />
    );
}
