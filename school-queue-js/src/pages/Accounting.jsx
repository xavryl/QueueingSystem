import SharedCounter from '../components/SharedCounter';

export default function Accounting() {
  // Department ID 2 = Accounting
  return (
    <SharedCounter 
      departmentId={2} 
      departmentName="ACCOUNTING (ACT)" 
    />
  );
}