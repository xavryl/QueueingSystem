import SharedCounter from '../components/SharedCounter';

export default function Registrar() {
  // Department ID 1 = Registrar
  return (
    <SharedCounter 
      departmentId={1} 
      departmentName="REGISTRAR (REG)" 
    />
  );
}