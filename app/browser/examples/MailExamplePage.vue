<script lang="ts" setup>
import ExamplesShell from './ExamplesShell.vue'
import MailExample from './MailExample.vue'
import source from './MailExample.vue?raw'
</script>

<template>
	<ExamplesShell id="example-mail" title="Mail" :source="source">
		<MailExample />
	</ExamplesShell>
</template>
