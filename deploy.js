#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Iniciando deploy automático...\n');

// Parar todos os processos Node.js para evitar conflitos
console.log('🛑 Parando processos Node.js...');
try {
  if (process.platform === 'win32') {
    execSync('taskkill /f /im node.exe', { stdio: 'ignore' });
  } else {
    execSync('pkill -f node', { stdio: 'ignore' });
  }
  console.log('✅ Processos Node.js parados');
} catch (error) {
  console.log('ℹ️ Nenhum processo Node.js encontrado');
}

// Aguardar um pouco para liberar arquivos
await new Promise(resolve => setTimeout(resolve, 2000));

// Verificar se o Railway CLI está instalado
try {
  execSync('railway --version', { stdio: 'ignore' });
  console.log('✅ Railway CLI encontrado');
} catch (error) {
  console.log('❌ Railway CLI não encontrado. Instalando...');
  try {
    execSync('npm install -g @railway/cli', { stdio: 'inherit' });
    console.log('✅ Railway CLI instalado com sucesso');
  } catch (installError) {
    console.error('❌ Erro ao instalar Railway CLI:', installError.message);
    console.log('\n💡 Tente instalar manualmente:');
    console.log('npm install -g @railway/cli');
    process.exit(1);
  }
}

// Verificar se está logado no Railway
try {
  execSync('railway whoami', { stdio: 'ignore' });
  console.log('✅ Usuário logado no Railway');
} catch (error) {
  console.log('❌ Não está logado no Railway. Fazendo login...');
  console.log('🔗 Abrindo navegador para login...');
  try {
    execSync('railway login', { stdio: 'inherit' });
  } catch (loginError) {
    console.error('❌ Erro no login. Tente fazer login manualmente:');
    console.log('railway login');
    process.exit(1);
  }
}

// Verificar se existe um projeto Railway
let projectExists = false;
try {
  execSync('railway status', { stdio: 'ignore' });
  projectExists = true;
  console.log('✅ Projeto Railway encontrado');
} catch (error) {
  console.log('❌ Projeto Railway não encontrado. Criando novo projeto...');
}

if (!projectExists) {
  try {
    execSync('railway init', { stdio: 'inherit' });
    console.log('✅ Projeto Railway criado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao criar projeto Railway:', error.message);
    console.log('\n💡 Tente criar manualmente:');
    console.log('railway init');
    process.exit(1);
  }
}

// Limpar build anterior
console.log('\n🧹 Limpando build anterior...');
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  console.log('✅ Build anterior removido');
} catch (error) {
  console.log('ℹ️ Nenhum build anterior encontrado');
}

// Build da aplicação
console.log('\n📦 Fazendo build da aplicação...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build concluído com sucesso');
} catch (error) {
  console.error('❌ Erro no build:', error.message);
  process.exit(1);
}

// Aguardar um pouco antes do deploy
await new Promise(resolve => setTimeout(resolve, 1000));

// Deploy para o Railway
console.log('\n🚀 Fazendo deploy para o Railway...');
try {
  execSync('railway up --detach', { stdio: 'inherit' });
  console.log('\n✅ Deploy iniciado com sucesso!');
  
  console.log('\n⏳ Aguardando deploy finalizar...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Obter URL do projeto
  try {
    const url = execSync('railway domain', { encoding: 'utf8' }).trim();
    console.log(`\n🌐 Sua aplicação está disponível em: ${url}`);
    console.log('\n📋 Próximos passos:');
    console.log('1. Acesse a URL acima');
    console.log('2. Configure sua barbearia');
    console.log('3. Conecte o WhatsApp');
    console.log('4. Teste o envio de mensagens');
    console.log('\n💡 Dica: Pode levar alguns minutos para a aplicação ficar totalmente online.');
  } catch (domainError) {
    console.log('\n✅ Deploy concluído! Verifique o dashboard do Railway para obter a URL.');
    console.log('🔗 Dashboard: https://railway.app/dashboard');
  }
  
} catch (error) {
  console.error('❌ Erro no deploy:', error.message);
  console.log('\n💡 Possíveis soluções:');
  console.log('1. Tente novamente: npm run deploy');
  console.log('2. Deploy manual: railway up');
  console.log('3. Verifique o dashboard: https://railway.app/dashboard');
  process.exit(1);
}

console.log('\n🎉 Deploy automático concluído com sucesso!');