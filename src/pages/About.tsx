import React from 'react';
import { Link } from 'react-router-dom';

// This file is no longer used for "About" page.
// It's kept to avoid breaking imports in a real scenario, but it's not routed in App.tsx.
// The content for "Preços" is in Precos.tsx
// The content for "Funcionalidades" is in Funcionalidades.tsx

const About: React.FC = () => {
  return (
    <div className="pt-20 pb-16 text-center">
      <h1 className="text-2xl">Página Antiga - Não utilizada</h1>
      <p>Esta página foi substituída.</p>
      <Link to="/" className="text-blue-600">Voltar para a Home</Link>
    </div>
  );
};

export default About;
