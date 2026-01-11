<script lang="ts">
	import { marked } from 'marked';

	marked.setOptions({
		breaks: true
	});

	export let content: string;
</script>

<div>{@html marked.parse(content)}</div>