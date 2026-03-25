async function testApprove() {
  console.log('Fetching pending items...');
  fetch('http://127.0.0.1:3000/api/knowledge?status=reviewed')
    .then(res => res.json())
    .then(data => {
      console.log('Pending Items:', data.items.map(i => ({ id: i.id, title: i.title, version_range: i.version_range })));
      const target = data.items[0];
      if (!target) {
        console.log('No reviewed items found.');
        return;
      }
      console.log('Targeting ID:', target.id);
      
      return fetch('http://127.0.0.1:3000/api/knowledge/' + target.id + '/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'user-system-test' })
      });
    })
    .then(res => {
      if (!res) return;
      console.log('Approve status:', res.status, res.statusText);
      return res.text();
    })
    .then(text => {
      if (!text) return;
      console.log('Approve body:', text);
    })
    .catch(err => {
      console.error('Error in fetch chain:', err);
    });
}

testApprove();
