<script lang="ts">
	import { marked } from 'marked';

	marked.setOptions({
		breaks: true
	});

	export let content: string;
</script>

<div class="prose prose-invert max-w-none">{@html marked.parse(content)}</div>