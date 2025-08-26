import requests

API_BASE = "https://hairfycombr.uazapi.com"
ADMIN_TOKEN = "clNjDFU0jDHs0wZsEceKtY0ft9vrgShFZ7tdtH8UipSJZk5Nig"

def listar_instancias():
    url = f"{API_BASE}/instance/all"
    headers = {
        "Accept": "application/json",
        "admintoken": ADMIN_TOKEN
    }
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json()

def deletar_instancia(token):
    url = f"{API_BASE}/instance"
    headers = {
        "Accept": "application/json",
        "token": token
    }
    resp = requests.delete(url, headers=headers)
    if resp.status_code == 200:
        print(f"✅ Instância com token {token} deletada com sucesso!")
    else:
        print(f"⚠️ Erro ao deletar token {token}: {resp.status_code} - {resp.text}")

def main():
    instancias = listar_instancias()
    if not instancias:
        print("Nenhuma instância encontrada!")
        return

    print(f"Encontradas {len(instancias)} instâncias.")
    for inst in instancias:
        nome = inst.get("name", "sem-nome")
        token = inst.get("token")
        print(f"➡️ Deletando instância {nome} (token: {token})...")
        deletar_instancia(token)

if __name__ == "__main__":
    main()
