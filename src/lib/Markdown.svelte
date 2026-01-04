<script lang="ts">
	import { marked } from 'marked';

	export let content: string;
</script>

<div>{@html marked.parse(content)}</div>