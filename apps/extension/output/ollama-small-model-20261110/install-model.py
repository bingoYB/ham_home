"""Install the exact official manifest and verified blobs when Ollama rejects proxy fake IPs."""
import hashlib
import json
import pathlib
import shutil
import subprocess

output = pathlib.Path(__file__).resolve().parent
manifest_path = output / "model-manifest.json"
shutil.copyfile("/tmp/hamhome-qwen-manifest.json", manifest_path)
manifest = json.loads(manifest_path.read_text())
models = pathlib.Path.home() / ".ollama" / "models"
audit = []

def checksum(path):
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

for layer in [*manifest["layers"], manifest["config"]]:
    digest = layer["digest"]
    expected_hash = digest.split(":", 1)[1]
    target = models / "blobs" / digest.replace(":", "-")
    if not (target.exists() and target.stat().st_size == layer["size"] and checksum(target) == expected_hash):
        partial = target.with_suffix(".hamhome-download")
        url = "https://registry.ollama.ai/v2/library/qwen2.5/blobs/" + digest
        print("Downloading", digest, layer["size"], flush=True)
        subprocess.run([
            "curl", "--fail", "--location", "--silent", "--show-error",
            "--retry", "3", "--connect-timeout", "20", "--max-time", "600",
            "--output", str(partial), url,
        ], check=True)
        actual_hash = checksum(partial)
        if actual_hash != expected_hash or partial.stat().st_size != layer["size"]:
            raise ValueError("Blob integrity check failed: " + digest)
        partial.replace(target)
    audit.append({**layer, "verified": True, "path": str(target)})
    (output / "installation.json").write_text(json.dumps(audit, indent=2))
    print("Verified", digest, flush=True)

destination = models / "manifests" / "registry.ollama.ai" / "library" / "qwen2.5" / "0.5b-instruct"
destination.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(manifest_path, destination)
print("Installed", destination, flush=True)
