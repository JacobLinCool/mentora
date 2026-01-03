<script>
    let { className = "", children } = $props();
</script>

<div class="card-glass animate-slide-up rounded-3xl p-6 {className}">
    {@render children?.()}
</div>
