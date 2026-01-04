<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/main');
	});
</script>

<p>Redirecting to main page...</p>
